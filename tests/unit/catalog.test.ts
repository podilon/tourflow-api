import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import type {
  CatalogRepository,
  DepartureRecord,
  ExperienceRecord,
} from '../../src/repositories/catalog-repository.js';
import { createPgCatalogRepository } from '../../src/repositories/pg/pg-catalog-repository.js';
import { createCatalogService, toDeparture } from '../../src/services/catalog-service.js';

const BOAT = '8f0c2a1e-1b6d-4c1a-9a51-0d2b6f1e7a01';
const TRAIL = '8f0c2a1e-1b6d-4c1a-9a51-0d2b6f1e7a02';
const MISSING = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const experiences: ExperienceRecord[] = [
  { id: BOAT, name: 'Passeio fictício', description: 'Sintética.', durationMinutes: 180 },
  { id: TRAIL, name: 'Trilha fictícia', description: 'Sintética.', durationMinutes: 240 },
];

const departures: DepartureRecord[] = [
  {
    id: '3c9e7b52-6a0f-4d8e-8b1c-5f2a9d4e6b01',
    experienceId: BOAT,
    startsAt: new Date('2026-11-18T09:00:00Z'),
    capacity: 12,
    reservedSeats: 5,
    priceCents: 18900,
  },
  {
    id: '3c9e7b52-6a0f-4d8e-8b1c-5f2a9d4e6b03',
    experienceId: TRAIL,
    startsAt: new Date('2026-11-21T09:00:00Z'),
    capacity: 8,
    reservedSeats: 0,
    priceCents: 9900,
  },
];

/** Repositório fake que aplica o filtro como o SQL real. */
function fakeRepository(): CatalogRepository {
  return {
    listExperiences: vi.fn(async () => experiences),
    listDepartures: vi.fn(async ({ experienceId }) =>
      departures.filter((d) => experienceId === undefined || d.experienceId === experienceId),
    ),
  };
}

function appWith(repository: CatalogRepository = fakeRepository()) {
  return createApp({
    checkDatabase: async () => undefined,
    catalogService: createCatalogService(repository),
    reservationService: { create: vi.fn(), get: vi.fn() },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('toDeparture', () => {
  it('serializa início em ISO UTC e calcula vagas como capacidade menos reservas', () => {
    expect(toDeparture(departures[0]!)).toEqual({
      id: '3c9e7b52-6a0f-4d8e-8b1c-5f2a9d4e6b01',
      experienceId: BOAT,
      startsAt: '2026-11-18T09:00:00.000Z',
      capacity: 12,
      availableSeats: 7,
      priceCents: 18900,
    });
  });
});

describe('GET /experiences', () => {
  it('responde 200 com o array do repositório, na ordem recebida', async () => {
    const response = await request(appWith()).get('/experiences');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body).toEqual(experiences);
  });

  it('responde 200 com array vazio quando não há experiências', async () => {
    const repository = fakeRepository();
    vi.mocked(repository.listExperiences).mockResolvedValueOnce([]);

    const response = await request(appWith(repository)).get('/experiences');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe('GET /departures', () => {
  it('lista todas as saídas sem filtro, com priceCents inteiro e startsAt ISO UTC', async () => {
    const repository = fakeRepository();

    const response = await request(appWith(repository)).get('/departures');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toEqual({
      id: departures[0]!.id,
      experienceId: BOAT,
      startsAt: '2026-11-18T09:00:00.000Z',
      capacity: 12,
      availableSeats: 7,
      priceCents: 18900,
    });
    expect(Number.isInteger(response.body[1].priceCents)).toBe(true);
    expect(repository.listDepartures).toHaveBeenCalledWith({});
  });

  it('com UUID existente retorna apenas as saídas da experiência', async () => {
    const repository = fakeRepository();

    const response = await request(appWith(repository)).get(`/departures?experienceId=${TRAIL}`);

    expect(response.status).toBe(200);
    expect(response.body.map((d: { experienceId: string }) => d.experienceId)).toEqual([TRAIL]);
    expect(repository.listDepartures).toHaveBeenCalledWith({ experienceId: TRAIL });
  });

  it('com UUID válido inexistente retorna 200 e array vazio', async () => {
    const response = await request(appWith()).get(`/departures?experienceId=${MISSING}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it.each([
    ['UUID inválido', 'experienceId=abc-entrada-ecoada'],
    ['valor vazio', 'experienceId='],
    ['parâmetro repetido', `experienceId=${BOAT}&experienceId=${TRAIL}`],
    ['parâmetro desconhecido', 'filtro=abc-entrada-ecoada'],
    ['desconhecido junto com válido', `experienceId=${BOAT}&extra=abc-entrada-ecoada`],
    ['notação de objeto', 'experienceId[x]=abc-entrada-ecoada'],
  ])('%s retorna 400 VALIDATION_ERROR sem ecoar a entrada', async (_label, query) => {
    const repository = fakeRepository();

    const response = await request(appWith(repository)).get(`/departures?${query}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' },
    });
    expect(response.text).not.toContain('abc-entrada-ecoada');
    expect(response.text).not.toContain(BOAT);
    expect(repository.listDepartures).not.toHaveBeenCalled();
  });

  it('falha do repositório vira 500 INTERNAL_ERROR sem detalhe interno', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const repository = fakeRepository();
    vi.mocked(repository.listDepartures).mockRejectedValueOnce(new Error('detalhe-interno-sql'));

    const response = await request(appWith(repository)).get('/departures');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(response.text).not.toContain('detalhe-interno-sql');
  });

  it('falha ao listar experiências também vira 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const repository = fakeRepository();
    vi.mocked(repository.listExperiences).mockRejectedValueOnce(new Error('down'));

    expect((await request(appWith(repository)).get('/experiences')).status).toBe(500);
  });
});

describe('createPgCatalogRepository', () => {
  it('lista experiências com ordenação estável e sem parâmetros', async () => {
    const query = vi.fn(async () => ({ rows: experiences }));

    await expect(createPgCatalogRepository({ query }).listExperiences()).resolves.toEqual(
      experiences,
    );
    const [sql, values] = query.mock.calls[0] as unknown as [string, unknown];
    expect(sql).toMatch(/ORDER BY name, id/);
    expect(values).toBeUndefined();
  });

  it('passa o filtro como parâmetro $1, nunca concatenado no SQL', async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    const repository = createPgCatalogRepository({ query });

    await repository.listDepartures({ experienceId: TRAIL });
    await repository.listDepartures({});

    const calls = query.mock.calls as unknown as [string, unknown[]][];
    expect(calls[0]![0]).not.toContain(TRAIL);
    expect(calls[0]![0]).toMatch(/\$1::uuid/);
    expect(calls[0]![0]).toMatch(/ORDER BY starts_at, id/);
    expect(calls[0]![1]).toEqual([TRAIL]);
    expect(calls[1]![1]).toEqual([null]);
  });
});
