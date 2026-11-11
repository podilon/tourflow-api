import pg from 'pg';
import type { DbConfig } from '../../config/env.js';

const CONNECT_TIMEOUT_MS = 2_000;
const QUERY_TIMEOUT_MS = 2_000;

/** Parâmetros explícitos; nenhum valor vem de connection string nem de PG*. */
export function connectionOptions(config: DbConfig): pg.ClientConfig {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    query_timeout: QUERY_TIMEOUT_MS,
    application_name: 'tourflow-api',
  };
}

/**
 * Pool da API. O listener de `error` impede que a queda do banco derrube o
 * processo quando um cliente ocioso perde a conexão; o pool descarta o
 * cliente e o próximo uso tenta reconectar.
 */
export function createPool(config: DbConfig): pg.Pool {
  const pool = new pg.Pool({ ...connectionOptions(config), max: 10, idleTimeoutMillis: 10_000 });
  pool.on('error', () => {
    console.error('PostgreSQL idle client error; connection discarded');
  });
  return pool;
}

/** Único alvo aceito por migration e seed: o banco de desenvolvimento do Compose. */
export const WRITE_TARGET = Object.freeze({ host: 'db', port: 5432, database: 'tourflow' });

/** Conferência antes de conectar: host, porta interna e nome do banco configurados. */
export function assertWriteTargetConfig(config: DbConfig): void {
  if (
    config.host !== WRITE_TARGET.host ||
    config.port !== WRITE_TARGET.port ||
    config.database !== WRITE_TARGET.database
  ) {
    throw new Error(
      `Refusing to write: target must be ${WRITE_TARGET.host}:${WRITE_TARGET.port}/${WRITE_TARGET.database}`,
    );
  }
}

interface Queryable {
  query(text: string): Promise<{ rows: unknown[] }>;
}

/** Conferência depois de conectar: o servidor confirma banco e porta reais. */
export async function assertConnectedWriteTarget(client: Queryable): Promise<void> {
  const { rows } = await client.query(
    'SELECT current_database() AS database, inet_server_port() AS port',
  );
  const row = rows[0] as { database?: unknown; port?: unknown } | undefined;
  if (row?.database !== WRITE_TARGET.database || row.port !== WRITE_TARGET.port) {
    throw new Error('Refusing to write: connected server does not match the expected target');
  }
}

/**
 * Descrição segura de falha para logs: código (SQLSTATE ou errno) quando
 * houver; senão, a mensagem dos erros próprios, que não contêm valores.
 */
export function describeDbError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code: unknown };
    if (typeof code === 'string') return `error code ${code}`;
  }
  return error instanceof Error ? error.message : 'unknown error';
}

/**
 * Executa `work` numa única transação no alvo de escrita, depois de conferir
 * a configuração (antes de conectar) e o servidor (depois de conectar).
 */
export async function withWriteTarget(
  config: DbConfig,
  work: (client: pg.Client) => Promise<void>,
): Promise<void> {
  assertWriteTargetConfig(config);
  const client = new pg.Client(connectionOptions(config));
  await client.connect();
  try {
    await assertConnectedWriteTarget(client);
    await client.query('BEGIN');
    try {
      await work(client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    }
  } finally {
    await client.end();
  }
}
