import { inspect } from 'node:util';
import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp as buildApp } from '../../src/app.js';
import { loadDbConfig, loadEnv } from '../../src/config/env.js';
import { errorHandler } from '../../src/http/middlewares/error-handler.js';

/** Aplicação com dependências fake: estes testes não acessam banco. */
const createApp = () =>
  buildApp({
    checkDatabase: async () => undefined,
    catalogService: { listExperiences: async () => [], listDepartures: async () => [] },
    reservationService: {
      create: async () => {
        throw new Error('not used');
      },
      get: async () => {
        throw new Error('not used');
      },
    },
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createApp', () => {
  it('responde 404 NOT_FOUND em JSON para rota desconhecida', async () => {
    const response = await request(createApp()).get('/rota-inexistente');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: expect.any(String) },
    });
  });

  it('aplica o mesmo contrato 404 a outros métodos HTTP', async () => {
    const response = await request(createApp()).delete('/reservations/qualquer');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('não registra rotas de reserva além de POST e GET', async () => {
    const response = await request(createApp()).put('/reservations');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('responde 400 VALIDATION_ERROR para corpo JSON malformado', async () => {
    const response = await request(createApp())
      .post('/reservations')
      .set('Content-Type', 'application/json')
      .send('{"participants":');

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: expect.any(String) },
    });
  });

  it('responde 400 VALIDATION_ERROR para corpo JSON acima de 16 KB', async () => {
    const oversizedBody = JSON.stringify({ customerName: 'x'.repeat(17 * 1024) });

    const response = await request(createApp())
      .post('/reservations')
      .set('Content-Type', 'application/json')
      .send(oversizedBody);

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Request body too large' },
    });
  });

  it('responde 400 VALIDATION_ERROR para charset de corpo não suportado', async () => {
    const response = await request(createApp())
      .post('/reservations')
      .set('Content-Type', 'application/json; charset=charset-ficticio')
      .send('{}');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('não expõe o cabeçalho X-Powered-By', async () => {
    const response = await request(createApp()).get('/rota-inexistente');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('errorHandler', () => {
  it('responde 500 INTERNAL_ERROR sem mensagem interna nem stack trace', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = express();
    app.get('/falha', () => {
      throw new Error('detalhe-interno-secreto');
    });
    app.use(errorHandler);

    const response = await request(app).get('/falha');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(response.text).not.toContain('detalhe-interno-secreto');
    expect(response.text).not.toContain('at ');
    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith('Unexpected error while handling request');
    // inspect (e não JSON.stringify) serializa Error com mensagem e stack.
    expect(inspect(consoleError.mock.calls)).not.toContain('detalhe-interno-secreto');
  });
});

describe('loadEnv', () => {
  it('aplica valores padrão quando as variáveis estão ausentes', () => {
    expect(loadEnv({})).toEqual({ NODE_ENV: 'development', HOST: '0.0.0.0', PORT: 3000 });
  });

  it('converte e valida valores informados', () => {
    expect(loadEnv({ NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '8080' })).toEqual({
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: 8080,
    });
  });

  it('falha explicitamente sem ecoar o valor inválido', () => {
    expect(() => loadEnv({ PORT: 'porta-invalida' })).toThrow(
      'Invalid environment configuration: PORT',
    );
    expect(() => loadEnv({ PORT: '70000', NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});

describe('loadDbConfig', () => {
  const valid = {
    DB_HOST: 'db',
    DB_PORT: '5432',
    DB_NAME: 'tourflow',
    DB_USER: 'tourflow',
    DB_PASSWORD: 'senha-ficticia',
  };

  it('converte as variáveis discretas em parâmetros de conexão', () => {
    expect(loadDbConfig(valid)).toEqual({
      host: 'db',
      port: 5432,
      database: 'tourflow',
      user: 'tourflow',
      password: 'senha-ficticia',
    });
  });

  it('falha citando apenas os nomes ausentes, sem ecoar a senha', () => {
    const attempt = () => loadDbConfig({ ...valid, DB_HOST: '', DB_PORT: 'x' });

    expect(attempt).toThrow('Invalid environment configuration: DB_HOST, DB_PORT');
    expect(() => loadDbConfig({ DB_PASSWORD: 'senha-ficticia' })).not.toThrow(/senha-ficticia/);
  });

  it.each(['PGOPTIONS', 'PGHOST', 'PGSSLMODE', 'pgdatabase', 'DATABASE_URL'])(
    'rejeita a variável de redirecionamento %s',
    (name) => {
      expect(() => loadDbConfig({ ...valid, [name]: 'qualquer' })).toThrow(
        `Unsupported connection override variables: ${name}`,
      );
    },
  );
});
