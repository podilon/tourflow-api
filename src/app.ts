import express, { type Express } from 'express';
import { errorHandler } from './http/middlewares/error-handler.js';
import { notFoundHandler } from './http/middlewares/not-found.js';
import { catalogRouter } from './http/routes/catalog.js';
import { healthRouter } from './http/routes/health.js';
import { reservationsRouter } from './http/routes/reservations.js';
import type { DatabaseHealthCheck } from './infra/db/health.js';
import type { CatalogService } from './services/catalog-service.js';
import type { ReservationService } from './services/reservation-service.js';

/** Dependências injetadas pelo server.ts (ou por fakes nos testes). */
export interface AppDependencies {
  checkDatabase: DatabaseHealthCheck;
  catalogService: CatalogService;
  reservationService: ReservationService;
}

/** Monta a aplicação sem abrir porta, para uso direto pelo Supertest. */
export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.use(healthRouter(deps.checkDatabase));
  app.use(catalogRouter(deps.catalogService));
  app.use(reservationsRouter(deps.reservationService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
