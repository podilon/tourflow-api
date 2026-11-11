import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import type pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createDatabaseHealthCheck } from '../../src/infra/db/health.js';
import { createMetrics } from '../../src/infra/metrics.js';
import { createPgCatalogRepository } from '../../src/repositories/pg/pg-catalog-repository.js';
import { createPgReservationRepository } from '../../src/repositories/pg/pg-reservation-repository.js';
import { createCatalogService } from '../../src/services/catalog-service.js';
import { createReservationService } from '../../src/services/reservation-service.js';
import { connectTestClient, openTestPool } from '../helpers/test-db.js';

/**
 * API real (Express + repositórios PostgreSQL) contra o db-test isolado.
 * Cada teste cria sua própria experiência e saída fictícias com UUIDs novos;
 * nada é apagado (o tmpfs do db-test é descartado ao parar o container).
 */
let pool: pg.Pool;
let app: Express;

beforeAll(async () => {
  pool = await openTestPool();
  const metrics = createMetrics();
  app = createApp({
    checkDatabase: createDatabaseHealthCheck(pool),
    catalogService: createCatalogService(createPgCatalogRepository(pool)),
    reservationService: createReservationService(createPgReservationRepository(pool), {
      onConfirmed: metrics.recordReservationConfirmed,
    }),
    metrics,
  });
});

/** Valor atual de tourflow_reservations_confirmed_total lido via GET /metrics. */
async function confirmedTotal(): Promise<number> {
  const response = await request(app).get('/metrics');
  expect(response.status).toBe(200);
  const match = /^tourflow_reservations_confirmed_total (\d+)$/m.exec(response.text);
  expect(match).not.toBeNull();
  return Number(match![1]);
}

afterAll(async () => {
  await pool?.end();
});

interface Fixture {
  experienceId: string;
  departureId: string;
  startsAt: Date;
}

/** Saída fictícia com início relativo ao relógio do banco (`startsIn` é um interval). */
async function createDeparture(capacity: number, startsIn: string): Promise<Fixture> {
  const experienceId = randomUUID();
  const departureId = randomUUID();
  await pool.query(
    'INSERT INTO experiences (id, name, description, duration_minutes) VALUES ($1, $2, $3, 60)',
    [experienceId, 'Experiencia ficticia de integracao', 'Fixture sintetica.'],
  );
  const { rows } = await pool.query(
    `INSERT INTO departures (id, experience_id, starts_at, capacity, reserved_seats, price_cents)
     VALUES ($1, $2, clock_timestamp() + $3::interval, $4, 0, 5000)
     RETURNING starts_at AS "startsAt"`,
    [departureId, experienceId, startsIn, capacity],
  );
  return { experienceId, departureId, startsAt: (rows[0] as { startsAt: Date }).startsAt };
}

async function departureState(departureId: string) {
  const { rows } = await pool.query(
    `SELECT d.reserved_seats AS "reservedSeats",
            (SELECT count(*)::int FROM reservations r WHERE r.departure_id = d.id) AS reservations
     FROM departures d WHERE d.id = $1`,
    [departureId],
  );
  return rows[0] as { reservedSeats: number; reservations: number };
}

const bodyFor = (departureId: string, participants = 2) => ({
  departureId,
  customerName: 'Cliente Ficticio Integracao',
  customerEmail: 'cliente.integracao@example.test',
  participants,
});

/** Dispara o POST imediatamente (o Supertest só envia quando há `then`). */
const postReservation = (body: object) =>
  request(app)
    .post('/reservations')
    .send(body)
    .then((response) => response);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Aguarda `expected` sessões da API esperando bloqueio (wait_event_type Lock)
 * no SELECT ... FOR UPDATE. O prazo fica abaixo do lock_timeout (1,5 s).
 */
async function waitForLockWaiters(expected: number, timeoutMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { rows } = await pool.query(
      `SELECT pid, xact_start AS "xactStart"
       FROM pg_stat_activity
       WHERE datname = current_database()
         AND pid <> pg_backend_pid()
         AND wait_event_type = 'Lock'
         AND query LIKE '%FOR UPDATE%'`,
    );
    const waiters = rows as { pid: number; xactStart: Date }[];
    if (waiters.length >= expected || Date.now() > deadline) return waiters;
    await sleep(10);
  }
}

/** Segura o bloqueio da saída numa transação separada, como uma reserva lenta. */
async function holdDepartureLock(departureId: string) {
  const holder = await connectTestClient();
  await holder.query('BEGIN');
  await holder.query('SELECT id FROM departures WHERE id = $1 FOR UPDATE', [departureId]);
  return holder;
}

describe('db-test', () => {
  it('a suíte está conectada ao banco isolado tourflow_test', async () => {
    const { rows } = await pool.query('SELECT current_database() AS database');
    expect(rows[0]).toEqual({ database: 'tourflow_test' });
    expect((await request(app).get('/health')).status).toBe(200);
  });
});

describe('POST /reservations e GET /reservations/:id', () => {
  it('confirma, persiste, ocupa vagas e devolve a mesma reserva na consulta', async () => {
    const { experienceId, departureId } = await createDeparture(12, '7 days');

    const created = await postReservation(bodyFor(departureId));

    expect(created.status).toBe(201);
    expect(created.headers.location).toBe(`/reservations/${created.body.id}`);
    expect(created.body).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      departureId,
      participants: 2,
      status: 'CONFIRMED',
      createdAt: expect.stringMatching(/Z$/),
    });
    expect(created.text).not.toContain('cliente.integracao@example.test');
    expect(created.text).not.toContain('Cliente Ficticio Integracao');

    const { rows } = await pool.query(
      'SELECT departure_id, customer_name, customer_email, participants, status FROM reservations WHERE id = $1',
      [created.body.id],
    );
    expect(rows).toEqual([
      {
        departure_id: departureId,
        customer_name: 'Cliente Ficticio Integracao',
        customer_email: 'cliente.integracao@example.test',
        participants: 2,
        status: 'CONFIRMED',
      },
    ]);
    expect(await departureState(departureId)).toEqual({ reservedSeats: 2, reservations: 1 });

    const fetched = await request(app).get(created.headers.location!);
    expect(fetched.status).toBe(200);
    expect(fetched.body).toEqual(created.body);

    const departures = await request(app).get(`/departures?experienceId=${experienceId}`);
    expect(departures.body).toEqual([expect.objectContaining({ id: departureId, availableSeats: 10 })]);
  });

  it('participantes acima das vagas: 409 NO_AVAILABILITY sem alterar o banco', async () => {
    const { departureId } = await createDeparture(3, '7 days');

    const response = await postReservation(bodyFor(departureId, 4));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('NO_AVAILABILITY');
    expect(await departureState(departureId)).toEqual({ reservedSeats: 0, reservations: 0 });
  });

  it('saída já iniciada: 409 DEPARTURE_CLOSED sem alterar o banco', async () => {
    const { departureId } = await createDeparture(3, '-1 day');

    const response = await postReservation(bodyFor(departureId));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DEPARTURE_CLOSED');
    expect(await departureState(departureId)).toEqual({ reservedSeats: 0, reservations: 0 });
  });

  it('saída inexistente: 404 NOT_FOUND', async () => {
    const response = await postReservation(bodyFor(randomUUID()));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('payload inválido: 400 VALIDATION_ERROR sem gravar', async () => {
    const { departureId } = await createDeparture(3, '7 days');

    const response = await postReservation({ ...bodyFor(departureId), status: 'CONFIRMED' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(await departureState(departureId)).toEqual({ reservedSeats: 0, reservations: 0 });
  });

  it('consulta: 404 para reserva inexistente e 400 para id inválido', async () => {
    expect((await request(app).get(`/reservations/${randomUUID()}`)).status).toBe(404);
    expect((await request(app).get('/reservations/abc')).status).toBe(400);
  });
});

describe('métrica tourflow_reservations_confirmed_total no db-test (F3-T2)', () => {
  it('201 incrementa depois do COMMIT e 409 não incrementa', async () => {
    const { departureId } = await createDeparture(3, '7 days');
    const before = await confirmedTotal();

    const created = await postReservation(bodyFor(departureId, 2));
    expect(created.status).toBe(201);
    // O incremento corresponde a uma linha já confirmada e visível em outra conexão.
    expect(await departureState(departureId)).toEqual({ reservedSeats: 2, reservations: 1 });
    expect(await confirmedTotal()).toBe(before + 1);

    const rejected = await postReservation(bodyFor(departureId, 2));
    expect(rejected.status).toBe(409);
    expect(rejected.body.error.code).toBe('NO_AVAILABILITY');
    expect(await departureState(departureId)).toEqual({ reservedSeats: 2, reservations: 1 });
    expect(await confirmedTotal()).toBe(before + 1);
  });
});

describe('concorrência sob SELECT ... FOR UPDATE', () => {
  it('duas reservas de 2 vagas numa saída de capacidade 3: um 201, um 409, capacidade preservada', async () => {
    const { departureId } = await createDeparture(3, '7 days');
    const holder = await holdDepartureLock(departureId);
    try {
      const pending = [postReservation(bodyFor(departureId)), postReservation(bodyFor(departureId))];

      // As duas requisições ficam bloqueadas na mesma linha antes de qualquer decisão.
      const waiters = await waitForLockWaiters(2);
      expect(waiters).toHaveLength(2);
      await holder.query('ROLLBACK');

      const responses = await Promise.all(pending);
      expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(responses.find((r) => r.status === 409)!.body.error.code).toBe('NO_AVAILABILITY');
      expect(await departureState(departureId)).toEqual({ reservedSeats: 2, reservations: 1 });
    } finally {
      await holder.query('ROLLBACK').catch(() => undefined);
      await holder.end();
    }
  });

  it('saída que se encerra durante a espera pelo bloqueio: 409 DEPARTURE_CLOSED sem gravar', async () => {
    // Começa daqui a 700 ms: aberta quando a transação da API inicia.
    const { departureId, startsAt } = await createDeparture(3, '700 milliseconds');
    const holder = await holdDepartureLock(departureId);
    try {
      const pending = postReservation(bodyFor(departureId));

      const [waiter] = await waitForLockWaiters(1);
      expect(waiter).toBeDefined();
      // A transação da API começou antes do início da saída: now() a aceitaria.
      expect(waiter!.xactStart.getTime()).toBeLessThan(startsAt.getTime());

      // Mantém o bloqueio até o relógio do banco passar do início da saída.
      for (;;) {
        const { rows } = await pool.query('SELECT clock_timestamp() > $1 AS passed', [startsAt]);
        if ((rows[0] as { passed: boolean }).passed) break;
        await sleep(20);
      }
      await holder.query('COMMIT');

      const response = await pending;
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('DEPARTURE_CLOSED');
      expect(await departureState(departureId)).toEqual({ reservedSeats: 0, reservations: 0 });
    } finally {
      await holder.query('ROLLBACK').catch(() => undefined);
      await holder.end();
    }
  });
});
