import { readdir, readFile } from 'node:fs/promises';

// src|dist/infra/db/ → <raiz>/db/migrations (o runtime copia db/).
const MIGRATIONS_DIR = new URL('../../../db/migrations/', import.meta.url);
const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;
// Chave fixa do advisory lock que serializa execuções concorrentes de migration.
const MIGRATION_LOCK_KEY = 7_420_011;

interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}

/**
 * Aplica as migrations versionadas pendentes. Deve rodar dentro de uma
 * transação aberta pelo chamador, depois de o chamador conferir o alvo
 * (desenvolvimento: db/tourflow; integração: db-test/tourflow_test).
 * Devolve quantas migrations foram aplicadas.
 */
export async function applyMigrations(
  client: Queryable,
  log: (message: string) => void = console.log,
): Promise<number> {
  const files = (await readdir(MIGRATIONS_DIR)).filter((name) => MIGRATION_FILE.test(name)).sort();

  // O lock é adquirido antes de qualquer consulta a schema_migrations.
  await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);

  const { rows } = await client.query(
    "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present",
  );
  if (!(rows[0] as { present?: boolean } | undefined)?.present) {
    await client.query(
      'CREATE TABLE schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    log('Created schema_migrations');
  }

  const applied = await client.query('SELECT version FROM schema_migrations');
  const appliedVersions = new Set((applied.rows as { version: string }[]).map((row) => row.version));

  let count = 0;
  for (const file of files) {
    const version = file.slice(0, -'.sql'.length);
    if (appliedVersions.has(version)) continue;
    await client.query(await readFile(new URL(file, MIGRATIONS_DIR), 'utf8'));
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
    log(`Applied migration ${version}`);
    count += 1;
  }
  log(count === 0 ? 'No pending migrations' : `Applied ${count} migration(s)`);
  return count;
}
