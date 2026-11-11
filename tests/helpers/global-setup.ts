import { applyMigrations } from '../../src/infra/db/migrations.js';
import { connectTestClient } from './test-db.js';

/**
 * Executado uma vez antes da suíte de integração: confere o alvo
 * (db-test:5432/tourflow_test, antes e depois de conectar) e só então aplica
 * o schema versionado existente, numa transação. Nada é apagado: cada teste
 * cria suas próprias fixtures fictícias e o tmpfs do db-test é descartado
 * quando o container para.
 */
export default async function setup(): Promise<void> {
  const client = await connectTestClient();
  try {
    await client.query('BEGIN');
    try {
      await applyMigrations(client, (message) => console.log(`[db-test] ${message}`));
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    }
  } finally {
    await client.end();
  }
}
