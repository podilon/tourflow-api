import { readFile } from 'node:fs/promises';
import { loadDbConfig } from '../../config/env.js';
import { describeDbError, withWriteTarget } from './pool.js';

// dist/infra/db/seed.js → /app/db/seeds/0001_demo_catalog.sql (o runtime copia db/).
const SEED_FILE = new URL('../../../db/seeds/0001_demo_catalog.sql', import.meta.url);

type Counts = { experiences: number; departures: number };

async function countCatalog(client: { query: (text: string) => Promise<{ rows: unknown[] }> }): Promise<Counts> {
  const { rows } = await client.query(
    'SELECT (SELECT count(*) FROM experiences)::int AS experiences, (SELECT count(*) FROM departures)::int AS departures',
  );
  return rows[0] as Counts;
}

async function seed(): Promise<void> {
  const sql = await readFile(SEED_FILE, 'utf8');

  await withWriteTarget(loadDbConfig(), async (client) => {
    const before = await countCatalog(client);
    // INSERT ... ON CONFLICT DO NOTHING: só insere ausentes; nada é atualizado.
    await client.query(sql);
    const after = await countCatalog(client);
    console.log(
      `Seed inserted ${after.experiences - before.experiences} experience(s) and ` +
        `${after.departures - before.departures} departure(s)`,
    );
  });
}

seed().catch((error: unknown) => {
  console.error(`Seed failed: ${describeDbError(error)}`);
  process.exitCode = 1;
});
