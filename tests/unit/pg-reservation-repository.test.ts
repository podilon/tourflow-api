import { describe, expect, it, vi } from 'vitest';
import { departureClosed, departureNotFound } from '../../src/domain/reservation.js';
import {
  CLOCK_SQL,
  createPgReservationRepository,
  FIND_RESERVATION_SQL,
  INSERT_RESERVATION_SQL,
  LOCK_DEPARTURE_SQL,
  OCCUPY_SEATS_SQL,
  TRANSACTION_SETTINGS_SQL,
  type TransactionClient,
} from '../../src/repositories/pg/pg-reservation-repository.js';

const DEPARTURE = '3c9e7b52-6a0f-4d8e-8b1c-5f2a9d4e6b01';
const input = {
  departureId: DEPARTURE,
  customerName: 'Cliente Ficticio Unitario',
  customerEmail: 'cliente.unitario@example.test',
  participants: 2,
};
const locked = { startsAt: new Date('2026-11-18T09:00:00Z'), capacity: 3, reservedSeats: 0 };
const now = new Date('2026-11-11T12:00:00Z');
const inserted = {
  id: '5d1f0a3b-9c2e-4f6a-8b7d-1e2f3a4b5c6d',
  departureId: DEPARTURE,
  participants: 2,
  status: 'CONFIRMED',
  createdAt: now,
};

type Responder = (sql: string) => { rows: unknown[] } | Error;

/** Cliente fake que registra cada SQL e responde conforme `respond`. */
function fakeClient(respond: Responder = () => ({ rows: [] })) {
  const sql: string[] = [];
  const query = vi.fn(async (text: string, _values?: unknown[]) => {
    sql.push(text);
    const result = respond(text);
    if (result instanceof Error) throw result;
    return result;
  });
  const release = vi.fn((_destroy?: boolean | Error) => undefined);
  const client = { query, release } satisfies TransactionClient;
  return { client, sql };
}

const happyPath: Responder = (text) => {
  if (text === LOCK_DEPARTURE_SQL) return { rows: [locked] };
  if (text === CLOCK_SQL) return { rows: [{ now }] };
  if (text === INSERT_RESERVATION_SQL) return { rows: [inserted] };
  return { rows: [] };
};

function repositoryWith(client: TransactionClient) {
  return createPgReservationRepository({ connect: async () => client, query: vi.fn() });
}

describe('createPgReservationRepository.create', () => {
  it('executa tudo numa transação, na ordem exigida, e devolve a conexão ao pool', async () => {
    const { client, sql } = fakeClient(happyPath);
    const guard = vi.fn();

    await expect(repositoryWith(client).create(input, guard)).resolves.toEqual(inserted);

    expect(sql).toEqual([
      'BEGIN',
      ...TRANSACTION_SETTINGS_SQL,
      LOCK_DEPARTURE_SQL,
      CLOCK_SQL,
      INSERT_RESERVATION_SQL,
      OCCUPY_SEATS_SQL,
      'COMMIT',
    ]);
    expect(guard).toHaveBeenCalledWith({ ...locked, now });
    expect(client.release).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('bloqueia com FOR UPDATE, lê clock_timestamp() e usa somente parâmetros', async () => {
    const { client } = fakeClient(happyPath);

    await repositoryWith(client).create(input, () => undefined);

    expect(LOCK_DEPARTURE_SQL).toMatch(/WHERE id = \$1\s+FOR UPDATE/);
    expect(CLOCK_SQL).toContain('clock_timestamp()');
    expect(OCCUPY_SEATS_SQL).toMatch(/reserved_seats = reserved_seats \+ \$2/);
    expect(TRANSACTION_SETTINGS_SQL).toEqual([
      "SET LOCAL lock_timeout = '1500ms'",
      "SET LOCAL statement_timeout = '1800ms'",
      "SET LOCAL idle_in_transaction_session_timeout = '5s'",
    ]);
    const calls = client.query.mock.calls;
    expect(calls.find(([text]) => text === LOCK_DEPARTURE_SQL)?.[1]).toEqual([DEPARTURE]);
    expect(calls.find(([text]) => text === INSERT_RESERVATION_SQL)?.[1]).toEqual([
      DEPARTURE,
      input.customerName,
      input.customerEmail,
      2,
    ]);
    expect(calls.find(([text]) => text === OCCUPY_SEATS_SQL)?.[1]).toEqual([DEPARTURE, 2]);
    for (const [text] of calls) expect(text).not.toContain(input.customerEmail);
  });

  it('não devolve nome nem e-mail no RETURNING nem na consulta', () => {
    for (const text of [INSERT_RESERVATION_SQL.split('RETURNING')[1]!, FIND_RESERVATION_SQL]) {
      expect(text).not.toMatch(/customer_/);
    }
  });

  it('saída inexistente: guard recebe undefined, sem ler o relógio, rollback e conexão reutilizável', async () => {
    const { client, sql } = fakeClient();
    const guard = vi.fn(() => {
      throw departureNotFound();
    });

    await expect(repositoryWith(client).create(input, guard)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(guard).toHaveBeenCalledWith(undefined);
    expect(sql).not.toContain(CLOCK_SQL);
    expect(sql.at(-1)).toBe('ROLLBACK');
    expect(client.release).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('regra de negócio violada: rollback sem INSERT/UPDATE e conexão reutilizável', async () => {
    const { client, sql } = fakeClient(happyPath);

    await expect(
      repositoryWith(client).create(input, () => {
        throw departureClosed();
      }),
    ).rejects.toMatchObject({ code: 'DEPARTURE_CLOSED' });

    expect(sql).not.toContain(INSERT_RESERVATION_SQL);
    expect(sql).not.toContain(OCCUPY_SEATS_SQL);
    expect(sql).not.toContain('COMMIT');
    expect(sql.at(-1)).toBe('ROLLBACK');
    expect(client.release).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('falha inesperada (ex.: lock_timeout): rollback e conexão descartada', async () => {
    const lockTimeout = Object.assign(new Error('canceling statement due to lock timeout'), {
      code: '55P03',
    });
    const { client, sql } = fakeClient((text) => (text === LOCK_DEPARTURE_SQL ? lockTimeout : { rows: [] }));

    await expect(repositoryWith(client).create(input, vi.fn())).rejects.toBe(lockTimeout);

    expect(sql.at(-1)).toBe('ROLLBACK');
    expect(client.release).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('falha no COMMIT: resultado incerto, conexão descartada', async () => {
    const { client } = fakeClient((text) => (text === 'COMMIT' ? new Error('connection lost') : happyPath(text)));

    await expect(repositoryWith(client).create(input, vi.fn())).rejects.toThrow('connection lost');

    expect(client.release).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('rollback que falha após regra de negócio também descarta a conexão', async () => {
    const { client } = fakeClient((text) => (text === 'ROLLBACK' ? new Error('broken') : happyPath(text)));

    await expect(
      repositoryWith(client).create(input, () => {
        throw departureClosed();
      }),
    ).rejects.toMatchObject({ code: 'DEPARTURE_CLOSED' });

    expect(client.release).toHaveBeenCalledExactlyOnceWith(true);
  });
});

describe('createPgReservationRepository.findById', () => {
  it('consulta por parâmetro e devolve undefined quando não existe', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [inserted] })
      .mockResolvedValueOnce({ rows: [] });
    const repository = createPgReservationRepository({ connect: vi.fn(), query });

    await expect(repository.findById(inserted.id)).resolves.toEqual(inserted);
    await expect(repository.findById(DEPARTURE)).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledWith(FIND_RESERVATION_SQL, [inserted.id]);
  });
});
