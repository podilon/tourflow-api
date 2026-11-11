import { loadDbConfig } from '../../config/env.js';
import { applyMigrations } from './migrations.js';
import { describeDbError, withWriteTarget } from './pool.js';

/**
 * Migrador de desenvolvimento: restrito a db:5432/tourflow (withWriteTarget
 * confere a configuração antes de conectar e o servidor depois).
 */
async function migrate(): Promise<void> {
  await withWriteTarget(loadDbConfig(), async (client) => {
    await applyMigrations(client);
  });
}

migrate().catch((error: unknown) => {
  console.error(`Migration failed: ${describeDbError(error)}`);
  process.exitCode = 1;
});
