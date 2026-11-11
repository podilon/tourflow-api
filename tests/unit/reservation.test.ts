import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import {
  assertReservable,
  availableSeats,
  DomainError,
  reservationRequestSchema,
  type DepartureSnapshot,
} from '../../src/domain/reservation.js';
import type {
  ReservationGuard,
  ReservationRecord,
  ReservationRepository,
} from '../../src/repositories/reservation-repository.js';
import { createReservationService, toReservation } from '../../src/services/reservation-service.js';

const DEPARTURE = '3c9e7b52-6a0f-4d8e-8b1c-5f2a9d4e6b01';
const RESERVATION = '5d1f0a3b-9c2e-4f6a-8b7d-1e2f3a4b5c6d';
const NOW = new Date('2026-11-11T12:00:00.000Z');

const validBody = {
  departureId: DEPARTURE,
  customerName: 'Cliente Ficticio Unitario',
  customerEmail: 'cliente.unitario@example.test',
  participants: 2,
};

const snapshot = (overrides: Partial<DepartureSnapshot> = {}): DepartureSnapshot => ({
  startsAt: new Date('2026-11-18T09:00:00.000Z'),
  capacity: 12,
  reservedSeats: 0,
  now: NOW,
  ...overrides,
});

const record: ReservationRecord = {
  id: RESERVATION,
  departureId: DEPARTURE,
  participants: 2,
  status: 'CONFIRMED',
  createdAt: new Date('2026-11-11T12:00:01.234Z'),
};

/**
 * Repositório fake que simula a transação: aplica o guard à saída em memória
 * e só "grava" (ocupa vagas) se o guard não lançar.
 */
function fakeRepository(departure: DepartureSnapshot | null = snapshot()) {
  const state = { departure: departure ?? undefined, saved: [] as ReservationRecord[] };
  const repository: ReservationRepository = {
    create: vi.fn(async (input, guard: ReservationGuard) => {
      guard(state.departure);
      state.departure!.reservedSeats += input.participants;
      const saved = { ...record, participants: input.participants };
      state.saved.push(saved);
      return saved;
    }),
    findById: vi.fn(async (id: string) => state.saved.find((r) => r.id === id)),
  };
  return { repository, state };
}

function appWith(repository: ReservationRepository) {
  return createApp({
    checkDatabase: async () => undefined,
    catalogService: { listExperiences: async () => [], listDepartures: async () => [] },
    reservationService: createReservationService(repository),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('reservationRequestSchema (RF-06)', () => {
  it('aceita payload válido e apara customerName', () => {
    const parsed = reservationRequestSchema.parse({ ...validBody, customerName: '  Nome  ' });
    expect(parsed).toEqual({ ...validBody, customerName: 'Nome' });
  });

  it.each([1, 20])('aceita participants no limite %i', (participants) => {
    expect(reservationRequestSchema.safeParse({ ...validBody, participants }).success).toBe(true);
  });

  it('aceita customerName com 120 caracteres e e-mail com 254', () => {
    const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(56)}.test`;
    expect(email).toHaveLength(254);
    const body = { ...validBody, customerName: 'n'.repeat(120), customerEmail: email };
    expect(reservationRequestSchema.safeParse(body).success).toBe(true);
  });

  it.each([
    ['participants 0', { participants: 0 }],
    ['participants 21', { participants: 21 }],
    ['participants fracionário', { participants: 1.5 }],
    ['participants como texto', { participants: '2' }],
    ['departureId inválido', { departureId: 'abc' }],
    ['customerName só com espaços', { customerName: '   ' }],
    ['customerName com 121 caracteres', { customerName: 'n'.repeat(121) }],
    ['customerEmail inválido', { customerEmail: 'sem-arroba' }],
    ['customerEmail acima de 254', { customerEmail: `${'a'.repeat(64)}@${'b'.repeat(190)}.test` }],
    ['propriedade desconhecida', { status: 'CONFIRMED' }],
  ])('rejeita %s', (_label, change) => {
    expect(reservationRequestSchema.safeParse({ ...validBody, ...change }).success).toBe(false);
  });

  it.each(['departureId', 'customerName', 'customerEmail', 'participants'])(
    'rejeita ausência de %s',
    (field) => {
      const body: Record<string, unknown> = { ...validBody };
      delete body[field];
      expect(reservationRequestSchema.safeParse(body).success).toBe(false);
    },
  );
});

describe('assertReservable (RF-03, RF-05)', () => {
  it('permite reserva futura com vagas suficientes, inclusive exatamente as restantes', () => {
    expect(() => assertReservable(snapshot(), 2)).not.toThrow();
    expect(() => assertReservable(snapshot({ capacity: 3, reservedSeats: 1 }), 2)).not.toThrow();
  });

  it('saída inexistente lança NOT_FOUND', () => {
    expect(() => assertReservable(undefined, 2)).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND', message: 'Departure not found' }),
    );
  });

  it.each([
    ['iniciando agora', NOW],
    ['no passado', new Date('2026-11-10T09:00:00.000Z')],
  ])('saída %s lança DEPARTURE_CLOSED', (_label, startsAt) => {
    expect(() => assertReservable(snapshot({ startsAt }), 1)).toThrow(
      expect.objectContaining({ code: 'DEPARTURE_CLOSED' }),
    );
  });

  it('participantes acima das vagas lança NO_AVAILABILITY', () => {
    expect(() => assertReservable(snapshot({ capacity: 3, reservedSeats: 2 }), 2)).toThrow(
      expect.objectContaining({ code: 'NO_AVAILABILITY' }),
    );
  });

  it('saída encerrada tem precedência sobre falta de vagas', () => {
    expect(() =>
      assertReservable(snapshot({ startsAt: NOW, capacity: 1, reservedSeats: 1 }), 2),
    ).toThrow(expect.objectContaining({ code: 'DEPARTURE_CLOSED' }));
  });

  it('erros de domínio são DomainError e calcula vagas como capacidade menos reservas', () => {
    expect(() => assertReservable(undefined, 1)).toThrow(DomainError);
    expect(availableSeats({ capacity: 12, reservedSeats: 5 })).toBe(7);
  });
});

describe('createReservationService', () => {
  it('cria via repositório, aplicando o guard com os participantes pedidos', async () => {
    const { repository, state } = fakeRepository(snapshot({ capacity: 3 }));

    const created = await createReservationService(repository).create(validBody);

    expect(created).toEqual(toReservation(record));
    expect(state.departure!.reservedSeats).toBe(2);
    expect(repository.create).toHaveBeenCalledWith(validBody, expect.any(Function));
  });

  it('não grava quando o guard rejeita', async () => {
    const { repository, state } = fakeRepository(snapshot({ capacity: 3, reservedSeats: 2 }));

    await expect(createReservationService(repository).create(validBody)).rejects.toMatchObject({
      code: 'NO_AVAILABILITY',
    });
    expect(state.saved).toEqual([]);
    expect(state.departure!.reservedSeats).toBe(2);
  });

  it('consulta por id e lança NOT_FOUND para reserva inexistente', async () => {
    const { repository } = fakeRepository();
    const service = createReservationService(repository);
    await service.create(validBody);

    await expect(service.get(RESERVATION)).resolves.toEqual(toReservation(record));
    await expect(service.get(DEPARTURE)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Reservation not found',
    });
  });

  it('toReservation expõe createdAt em ISO UTC e omite dados pessoais', () => {
    expect(toReservation(record)).toEqual({
      id: RESERVATION,
      departureId: DEPARTURE,
      participants: 2,
      status: 'CONFIRMED',
      createdAt: '2026-11-11T12:00:01.234Z',
    });
  });
});

describe('POST /reservations', () => {
  it('responde 201 com Location e corpo sem nome nem e-mail', async () => {
    const { repository } = fakeRepository();

    const response = await request(appWith(repository)).post('/reservations').send(validBody);

    expect(response.status).toBe(201);
    expect(response.headers.location).toBe(`/reservations/${RESERVATION}`);
    expect(response.body).toEqual({
      id: RESERVATION,
      departureId: DEPARTURE,
      participants: 2,
      status: 'CONFIRMED',
      createdAt: '2026-11-11T12:00:01.234Z',
    });
    expect(response.text).not.toContain(validBody.customerEmail);
    expect(response.text).not.toContain(validBody.customerName);
  });

  it.each([
    ['propriedade desconhecida', { ...validBody, extra: 'abc-entrada-ecoada' }],
    ['participants inválido', { ...validBody, participants: 0 }],
    ['corpo vazio', {}],
    ['array', [validBody]],
  ])('%s retorna 400 VALIDATION_ERROR sem chamar o repositório', async (_label, body) => {
    const { repository } = fakeRepository();

    const response = await request(appWith(repository)).post('/reservations').send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid reservation payload' },
    });
    expect(response.text).not.toContain('abc-entrada-ecoada');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('sem corpo JSON retorna 400', async () => {
    const { repository } = fakeRepository();

    const response = await request(appWith(repository)).post('/reservations');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each([
    ['saída inexistente', null, 404, 'NOT_FOUND'],
    ['saída encerrada', snapshot({ startsAt: NOW }), 409, 'DEPARTURE_CLOSED'],
    ['sem vagas', snapshot({ capacity: 3, reservedSeats: 2 }), 409, 'NO_AVAILABILITY'],
  ] as const)('%s retorna %s %s', async (_label, departure, status, code) => {
    const { repository, state } = fakeRepository(departure);

    const response = await request(appWith(repository)).post('/reservations').send(validBody);

    expect(response.status).toBe(status);
    expect(response.body).toEqual({ error: { code, message: expect.any(String) } });
    expect(state.saved).toEqual([]);
  });

  it('falha inesperada vira 500 INTERNAL_ERROR genérico', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { repository } = fakeRepository();
    vi.mocked(repository.create).mockRejectedValueOnce(new Error('detalhe-interno-sql'));

    const response = await request(appWith(repository)).post('/reservations').send(validBody);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(response.text).not.toContain('detalhe-interno-sql');
  });
});

describe('GET /reservations/:id', () => {
  it('responde 200 com a reserva persistida', async () => {
    const { repository } = fakeRepository();
    const app = appWith(repository);
    const created = await request(app).post('/reservations').send(validBody);

    const response = await request(app).get(`/reservations/${RESERVATION}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(created.body);
  });

  it('id inexistente retorna 404 NOT_FOUND', async () => {
    const response = await request(appWith(fakeRepository().repository)).get(
      `/reservations/${RESERVATION}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Reservation not found' },
    });
  });

  it('id fora do formato UUID retorna 400 sem consultar o repositório', async () => {
    const { repository } = fakeRepository();

    const response = await request(appWith(repository)).get('/reservations/abc-entrada-ecoada');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid reservation id' },
    });
    expect(response.text).not.toContain('abc-entrada-ecoada');
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('falha inesperada na consulta vira 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { repository } = fakeRepository();
    vi.mocked(repository.findById).mockRejectedValueOnce(new Error('down'));

    const response = await request(appWith(repository)).get(`/reservations/${RESERVATION}`);

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });
});
