import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import type { DbConfig } from '../../src/config/env.js';
import { createDatabaseHealthCheck } from '../../src/infra/db/health.js';
import {
  assertConnectedWriteTarget,
  assertWriteTargetConfig,
  connectionOptions,
  describeDbError,
} from '../../src/infra/db/pool.js';

describe('GET /health', () => {
  it('responde 200 quando o banco responde', async () => {
    const checkDatabase = vi.fn(async () => undefined);

    const response = await request(createApp({ checkDatabase })).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
    expect(checkDatabase).toHaveBeenCalledOnce();
  });

  it('responde 503 UNAVAILABLE sem expor o erro interno quando o banco falha', async () => {
    const checkDatabase = vi.fn(async () => {
      throw new Error('getaddrinfo ENOTFOUND db detalhe-interno');
    });

    const response = await request(createApp({ checkDatabase })).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: { code: 'UNAVAILABLE', message: 'Database is unavailable' },
    });
    expect(response.text).not.toContain('detalhe-interno');
  });

  it('volta a responder 200 na mesma instância quando o banco se recupera', async () => {
    let databaseUp = false;
    const app = createApp({
      checkDatabase: async () => {
        if (!databaseUp) throw new Error('down');
      },
    });

    expect((await request(app).get('/health')).status).toBe(503);
    databaseUp = true;
    expect((await request(app).get('/health')).status).toBe(200);
  });
});

describe('createDatabaseHealthCheck', () => {
  it('executa SELECT 1 e propaga a falha da consulta', async () => {
    const query = vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('down'));
    const check = createDatabaseHealthCheck({ query });

    await expect(check()).resolves.toBeUndefined();
    await expect(check()).rejects.toThrow('down');
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });
});

describe('guardas do alvo de escrita (migration e seed)', () => {
  const target: DbConfig = {
    host: 'db',
    port: 5432,
    database: 'tourflow',
    user: 'tourflow',
    password: 'senha-ficticia',
  };

  it('aceita somente db:5432/tourflow na configuração', () => {
    expect(() => assertWriteTargetConfig(target)).not.toThrow();
    for (const other of [
      { ...target, host: 'db-test' },
      { ...target, port: 5433 },
      { ...target, database: 'tourflow_test' },
    ]) {
      expect(() => assertWriteTargetConfig(other)).toThrow(/Refusing to write/);
    }
  });

  it('confere current_database() e a porta reportados pelo servidor', async () => {
    const reply = (database: string, port: number) => ({
      query: vi.fn(async () => ({ rows: [{ database, port }] })),
    });

    await expect(assertConnectedWriteTarget(reply('tourflow', 5432))).resolves.toBeUndefined();
    await expect(assertConnectedWriteTarget(reply('tourflow_test', 5432))).rejects.toThrow(
      /Refusing to write/,
    );
    await expect(assertConnectedWriteTarget(reply('tourflow', 6543))).rejects.toThrow(
      /Refusing to write/,
    );
    await expect(
      assertConnectedWriteTarget({ query: vi.fn(async () => ({ rows: [] })) }),
    ).rejects.toThrow(/Refusing to write/);
  });

  it('monta a conexão só com parâmetros explícitos e timeouts', () => {
    const options = connectionOptions(target);

    expect(options).toMatchObject({ host: 'db', port: 5432, database: 'tourflow', user: 'tourflow' });
    expect(options).not.toHaveProperty('connectionString');
    expect(options.connectionTimeoutMillis).toBeGreaterThan(0);
    expect(options.query_timeout).toBeGreaterThan(0);
  });

  it('descreve falhas por código, sem dados da conexão', () => {
    expect(describeDbError(Object.assign(new Error('password authentication failed'), { code: '28P01' }))).toBe(
      'error code 28P01',
    );
    expect(describeDbError(new Error('Refusing to write: x'))).toBe('Refusing to write: x');
    expect(describeDbError('texto')).toBe('unknown error');
  });
});
