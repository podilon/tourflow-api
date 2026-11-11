import { Writable } from 'node:stream';
import express from 'express';
import { Counter } from 'prom-client';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { DomainError } from '../../src/domain/reservation.js';
import { errorHandler } from '../../src/http/middlewares/error-handler.js';
import { requestContext } from '../../src/http/middlewares/request-context.js';
import { createLogger } from '../../src/infra/logger.js';
import { createMetrics, type AppMetrics } from '../../src/infra/metrics.js';
import type { ReservationRepository } from '../../src/repositories/reservation-repository.js';
import { createReservationService } from '../../src/services/reservation-service.js';

const DEPARTURE = '3c9e7b52-6a0f-4d8e-8b1c-5f2a9d4e6b01';
const RESERVATION = '5d1f0a3b-9c2e-4f6a-8b7d-1e2f3a4b5c6d';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const body = {
  departureId: DEPARTURE,
  customerName: 'Cliente Ficticio Observabilidade',
  customerEmail: 'cliente.obs@example.test',
  participants: 2,
};

/** Destino em memória: cada chamada de write é uma linha JSON do Pino. */
function memoryLog() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(chunk.toString('utf8'));
      callback();
    },
  });
  return { lines, logger: createLogger(stream) };
}

/** Repositório fake: confirma, ou lança o DomainError informado. */
function repository(failure?: DomainError): ReservationRepository {
  return {
    create: vi.fn(async (input) => {
      if (failure) throw failure;
      return {
        id: RESERVATION,
        departureId: input.departureId,
        participants: input.participants,
        status: 'CONFIRMED',
        createdAt: new Date('2026-11-11T12:00:00.000Z'),
      };
    }),
    findById: vi.fn(async () => undefined),
  };
}

function appWith(options: { failure?: DomainError; metrics?: AppMetrics } = {}) {
  const log = memoryLog();
  const metrics = options.metrics ?? createMetrics();
  const app = createApp({
    checkDatabase: async () => undefined,
    catalogService: {
      listExperiences: async () => {
        throw new Error('detalhe-interno-secreto');
      },
      listDepartures: async () => [],
    },
    reservationService: createReservationService(repository(options.failure), {
      onConfirmed: metrics.recordReservationConfirmed,
    }),
    logger: log.logger,
    metrics,
  });
  return { app, metrics, lines: log.lines };
}

async function onlyLine(lines: string[]): Promise<Record<string, unknown>> {
  await vi.waitFor(() => expect(lines).toHaveLength(1));
  expect(lines[0]!.endsWith('\n')).toBe(true);
  expect(lines[0]!.trimEnd()).not.toContain('\n');
  return JSON.parse(lines[0]!) as Record<string, unknown>;
}

async function confirmedTotal(app: express.Express): Promise<number> {
  const response = await request(app).get('/metrics');
  const match = /^tourflow_reservations_confirmed_total (\d+)$/m.exec(response.text);
  expect(match).not.toBeNull();
  return Number(match![1]);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('log de requisição (F3-T1)', () => {
  it('escreve uma linha JSON com os campos explícitos e devolve o request ID', async () => {
    const { app, lines } = appWith();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toMatch(UUID);
    const line = await onlyLine(lines);
    expect(line).toEqual({
      level: 30,
      time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
      requestId: response.headers['x-request-id'],
      method: 'GET',
      route: '/health',
      statusCode: 200,
      durationMs: expect.any(Number),
      msg: 'request completed',
    });
    expect(line.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('gera o request ID na API e ignora o enviado pelo cliente', async () => {
    const { app, lines } = appWith();

    const first = await request(app).get('/health').set('X-Request-Id', 'valor-do-cliente');
    const second = await request(app).get('/health');

    expect(first.headers['x-request-id']).toMatch(UUID);
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
    await vi.waitFor(() => expect(lines).toHaveLength(2));
    expect(lines.join('')).not.toContain('valor-do-cliente');
  });

  it('filtro inválido de /departures: 400 com errorCode, sem query nem URL bruta', async () => {
    const { app, lines } = appWith();

    const response = await request(app).get('/departures?experienceId=abc-entrada-ecoada');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const line = await onlyLine(lines);
    expect(line).toMatchObject({
      level: 40,
      route: '/departures',
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
    });
    expect(lines[0]).not.toContain('abc-entrada-ecoada');
    expect(lines[0]).not.toContain('experienceId');
  });

  it('POST /reservations não registra corpo, nome nem e-mail', async () => {
    const { app, lines } = appWith();

    const response = await request(app).post('/reservations').send(body);

    expect(response.status).toBe(201);
    const line = await onlyLine(lines);
    expect(line).toMatchObject({ method: 'POST', route: '/reservations', statusCode: 201 });
    expect(line).not.toHaveProperty('errorCode');
    expect(lines[0]).not.toContain(body.customerEmail);
    expect(lines[0]).not.toContain(body.customerName);
  });

  it('registra o padrão da rota com parâmetro, não o id recebido', async () => {
    const { app, lines } = appWith();

    await request(app).get(`/reservations/${RESERVATION}`);

    const line = await onlyLine(lines);
    expect(line).toMatchObject({ route: '/reservations/:id', statusCode: 404, errorCode: 'NOT_FOUND' });
    expect(lines[0]).not.toContain(RESERVATION);
  });

  it('rota desconhecida aparece como unmatched, sem o caminho', async () => {
    const { app, lines } = appWith();

    await request(app).get('/caminho-secreto?token=abc');

    const line = await onlyLine(lines);
    expect(line).toMatchObject({ route: 'unmatched', statusCode: 404, errorCode: 'NOT_FOUND' });
    expect(lines[0]).not.toContain('caminho-secreto');
    expect(lines[0]).not.toContain('token');
  });

  it('JSON malformado gera uma linha com VALIDATION_ERROR', async () => {
    const { app, lines } = appWith();

    await request(app).post('/reservations').set('Content-Type', 'application/json').send('{"a":');

    expect(await onlyLine(lines)).toMatchObject({ statusCode: 400, errorCode: 'VALIDATION_ERROR' });
  });

  it('500: nível error com INTERNAL_ERROR, sem mensagem nem stack do erro', async () => {
    const { app, lines } = appWith();

    const response = await request(app).get('/experiences');

    expect(response.status).toBe(500);
    const line = await onlyLine(lines);
    expect(line).toMatchObject({ level: 50, route: '/experiences', errorCode: 'INTERNAL_ERROR' });
    expect(line).not.toHaveProperty('err');
    expect(lines[0]).not.toContain('detalhe-interno-secreto');
    expect(lines[0]).not.toContain('at ');
  });

  it('errorHandler isolado não chama console nem expõe o erro', async () => {
    const consoleError = vi.spyOn(console, 'error');
    const log = memoryLog();
    const app = express();
    app.use(requestContext(log.logger));
    app.get('/falha', () => {
      throw new Error('detalhe-interno-secreto');
    });
    app.use(errorHandler);

    const response = await request(app).get('/falha');

    expect(response.status).toBe(500);
    expect(consoleError).not.toHaveBeenCalled();
    expect(await onlyLine(log.lines)).toMatchObject({ route: '/falha', errorCode: 'INTERNAL_ERROR' });
  });
});

describe('GET /metrics (F3-T2)', () => {
  it('responde 200 em formato Prometheus com o contador zerado', async () => {
    const { app } = appWith();

    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^text\/plain/);
    expect(response.text).toContain('# TYPE tourflow_reservations_confirmed_total counter');
    expect(await confirmedTotal(app)).toBe(0);
  });

  it('201 incrementa o contador', async () => {
    const { app } = appWith();

    expect((await request(app).post('/reservations').send(body)).status).toBe(201);

    expect(await confirmedTotal(app)).toBe(1);
  });

  it.each([
    ['409 NO_AVAILABILITY', new DomainError('NO_AVAILABILITY', 'x'), 409],
    ['404 NOT_FOUND', new DomainError('NOT_FOUND', 'x'), 404],
  ])('%s não incrementa', async (_label, failure, status) => {
    const { app } = appWith({ failure });

    expect((await request(app).post('/reservations').send(body)).status).toBe(status);

    expect(await confirmedTotal(app)).toBe(0);
  });

  it('400 não chega ao repositório e não incrementa', async () => {
    const { app } = appWith();

    expect((await request(app).post('/reservations').send({})).status).toBe(400);

    expect(await confirmedTotal(app)).toBe(0);
  });

  it('falha do contador não transforma a reserva confirmada em erro HTTP', async () => {
    const metrics = createMetrics();
    const counter = metrics.registry.getSingleMetric('tourflow_reservations_confirmed_total');
    expect(counter).toBeInstanceOf(Counter);
    const inc = vi.spyOn(counter as Counter, 'inc').mockImplementation(() => {
      throw new Error('falha-de-instrumentacao');
    });
    const { app } = appWith({ metrics });

    const response = await request(app).post('/reservations').send(body);

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(RESERVATION);
    expect(inc).toHaveBeenCalledOnce();
  });

  it('hook de confirmação que lança também é absorvido pelo serviço', async () => {
    const onConfirmed = vi.fn(() => {
      throw new Error('falha-de-instrumentacao');
    });
    const service = createReservationService(repository(), { onConfirmed });

    await expect(service.create(body)).resolves.toMatchObject({ id: RESERVATION });
    expect(onConfirmed).toHaveBeenCalledOnce();
  });

  it('hook não é chamado quando a reserva é rejeitada', async () => {
    const onConfirmed = vi.fn();
    const service = createReservationService(repository(new DomainError('NO_AVAILABILITY', 'x')), {
      onConfirmed,
    });

    await expect(service.create(body)).rejects.toBeInstanceOf(DomainError);
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('cada createMetrics usa um Registry próprio', async () => {
    const a = createMetrics();
    const b = createMetrics();
    a.recordReservationConfirmed();

    expect(await a.registry.metrics()).toMatch(/tourflow_reservations_confirmed_total 1/);
    expect(await b.registry.metrics()).toMatch(/tourflow_reservations_confirmed_total 0/);
  });

  it('falha ao serializar as métricas vira 500 INTERNAL_ERROR', async () => {
    const metrics = createMetrics();
    vi.spyOn(metrics.registry, 'metrics').mockRejectedValueOnce(new Error('detalhe-interno'));
    const { app } = appWith({ metrics });

    const response = await request(app).get('/metrics');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  });
});
