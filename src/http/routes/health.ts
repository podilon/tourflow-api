import { Router } from 'express';
import type { DatabaseHealthCheck } from '../../infra/db/health.js';

/**
 * GET /health: 200 quando API e banco respondem; 503 UNAVAILABLE quando o
 * banco está inacessível (PRD RF-07). O erro interno não é exposto nem logado.
 */
export function healthRouter(checkDatabase: DatabaseHealthCheck): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    try {
      await checkDatabase();
      res.status(200).json({ status: 'ok', database: 'up' });
    } catch {
      res
        .status(503)
        .json({ error: { code: 'UNAVAILABLE', message: 'Database is unavailable' } });
    }
  });

  return router;
}
