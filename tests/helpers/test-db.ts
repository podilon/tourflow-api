import pg from 'pg';
import { loadDbConfig, type DbConfig } from '../../src/config/env.js';
import { connectionOptions, createPool } from '../../src/infra/db/pool.js';

/** Único alvo aceito pela suíte de integração: o banco de teste em tmpfs. */
export const TEST_TARGET = Object.freeze({ host: 'db-test', port: 5432, database: 'tourflow_test' });

/**
 * Lê TEST_DB_* (definidas no serviço `dev` do Compose) com a mesma validação
 * da API; variáveis PG* e DATABASE_URL do processo continuam rejeitadas.
 */
export function loadTestDbConfig(source: NodeJS.ProcessEnv = process.env): DbConfig {
  return loadDbConfig({
    ...source,
    DB_HOST: source.TEST_DB_HOST,
    DB_PORT: source.TEST_DB_PORT,
    DB_NAME: source.TEST_DB_NAME,
    DB_USER: source.TEST_DB_USER,
    DB_PASSWORD: source.TEST_DB_PASSWORD,
  });
}

/** Conferência antes de conectar: exatamente db-test:5432/tourflow_test. */
export function assertTestTargetConfig(config: DbConfig): void {
  if (
    config.host !== TEST_TARGET.host ||
    config.port !== TEST_TARGET.port ||
    config.database !== TEST_TARGET.database
  ) {
    throw new Error(
      `Refusing to run integration tests: target must be ${TEST_TARGET.host}:${TEST_TARGET.port}/${TEST_TARGET.database}`,
    );
  }
}

interface Queryable {
  query(text: string): Promise<{ rows: unknown[] }>;
}

/** Conferência depois de conectar: current_database() e porta reais do servidor. */
export async function assertConnectedTestTarget(client: Queryable): Promise<void> {
  const { rows } = await client.query(
    'SELECT current_database() AS database, inet_server_port() AS port',
  );
  const row = rows[0] as { database?: unknown; port?: unknown } | undefined;
  if (row?.database !== TEST_TARGET.database || row.port !== TEST_TARGET.port) {
    throw new Error('Refusing to run integration tests: connected server is not the test database');
  }
}

/** Cliente avulso já conferido (usado pelo globalSetup e para segurar bloqueios). */
export async function connectTestClient(): Promise<pg.Client> {
  const config = loadTestDbConfig();
  assertTestTargetConfig(config);
  const client = new pg.Client(connectionOptions(config));
  await client.connect();
  try {
    await assertConnectedTestTarget(client);
  } catch (error) {
    await client.end();
    throw error;
  }
  return client;
}

/** Pool da API apontado para o banco de teste, conferido antes do primeiro uso. */
export async function openTestPool(): Promise<pg.Pool> {
  const config = loadTestDbConfig();
  assertTestTargetConfig(config);
  const pool = createPool(config);
  try {
    await assertConnectedTestTarget(pool);
  } catch (error) {
    await pool.end();
    throw error;
  }
  return pool;
}
