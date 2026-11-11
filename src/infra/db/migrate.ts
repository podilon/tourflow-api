import { readdir, readFile } from 'node:fs/promises';
import { loadDbConfig } from '../../config/env.js';
import { describeDbError, withWriteTarget } from './pool.js';

// dist/infra/db/migrate.js → /app/db/migrations (o runtime copia db/).
const MIGRATIONS_DIR = new URL('../../../db/migrations/', import.meta.url);
const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;
// Chave fixa do advisory lock que serializa execuções concorrentes de migration.
const MIGRATION_LOCK_KEY = 7_420_011;

async function migrate(): Promise<void> {
  const files = (await readdir(MIGRATIONS_DIR)).filter((name) => MIGRATION_FILE.test(name)).sort();

  await withWriteTarget(loadDbConfig(), async (client) => {
    // O lock é adquirido antes de qualquer consulta a schema_migrations.
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_KEY]);

    const { rows } = await client.query<{ present: boolean }>(
      "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present",
    );
    if (!rows[0]?.present) {
      await client.query(
        'CREATE TABLE schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
      );
      console.log('Created schema_migrations');
    }

    const applied = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(applied.rows.map((row) => row.version));

    let count = 0;
    for (const file of files) {
      const version = file.slice(0, -'.sql'.length);
      if (appliedVersions.has(version)) continue;
      await client.query(await readFile(new URL(file, MIGRATIONS_DIR), 'utf8'));
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      console.log(`Applied migration ${version}`);
      count += 1;
    }
    console.log(count === 0 ? 'No pending migrations' : `Applied ${count} migration(s)`);
  });
}

migrate().catch((error: unknown) => {
  console.error(`Migration failed: ${describeDbError(error)}`);
  process.exitCode = 1;
});
