/** Contrato mínimo consumido pela rota de saúde (permite fake nos testes). */
export type DatabaseHealthCheck = () => Promise<void>;

interface Queryable {
  query(text: string): Promise<unknown>;
}

/** Verifica a conexão com uma consulta trivial; rejeita se o banco estiver inacessível. */
export function createDatabaseHealthCheck(db: Queryable): DatabaseHealthCheck {
  return async () => {
    await db.query('SELECT 1');
  };
}
