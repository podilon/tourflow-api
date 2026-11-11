import { Router } from 'express';
import type { CatalogService } from '../../services/catalog-service.js';
import { createCatalogController } from '../controllers/catalog-controller.js';

/**
 * GET /experiences e GET /departures (PRD RF-01 e RF-02). Falhas do banco
 * chegam ao errorHandler (Express 5 encaminha rejeições) e viram 500.
 */
export function catalogRouter(service: CatalogService): Router {
  const controller = createCatalogController(service);
  const router = Router();

  router.get('/experiences', controller.listExperiences);
  router.get('/departures', controller.listDepartures);

  return router;
}
