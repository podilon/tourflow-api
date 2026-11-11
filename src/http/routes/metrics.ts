import { Router } from 'express';
import type { Registry } from 'prom-client';
import { sendError } from '../send-error.js';

/** GET /metrics: formato de exposição do Prometheus, a partir do Registry próprio. */
export function metricsRouter(registry: Registry): Router {
  const router = Router();

  router.get('/metrics', async (_req, res) => {
    try {
      const body = await registry.metrics();
      res.status(200).set('Content-Type', registry.contentType).send(body);
    } catch {
      sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
    }
  });

  return router;
}
