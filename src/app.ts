import express, { type Express } from 'express';
import { errorHandler } from './http/middlewares/error-handler.js';
import { notFoundHandler } from './http/middlewares/not-found.js';
import { requestContext } from './http/middlewares/request-context.js';
import { catalogRouter } from './http/routes/catalog.js';
import { healthRouter } from './http/routes/health.js';
import { metricsRouter } from './http/routes/metrics.js';
import { reservationsRouter } from './http/routes/reservations.js';
import type { DatabaseHealthCheck } from './infra/db/health.js';
import { createSilentLogger, type AppLogger } from './infra/logger.js';
import { createMetrics, type AppMetrics } from './infra/metrics.js';
import type { CatalogService } from './services/catalog-service.js';
import type { ReservationService } from './services/reservation-service.js';

/** Dependências injetadas pelo server.ts (ou por fakes nos testes). */
export interface AppDependencies {
  checkDatabase: DatabaseHealthCheck;
  catalogService: CatalogService;
  reservationService: ReservationService;
  /** Padrão: logger desligado. */
  logger?: AppLogger;
  /** Padrão: Registry novo e isolado. */
  metrics?: AppMetrics;
}

/** Monta a aplicação sem abrir porta, para uso direto pelo Supertest. */
export function createApp(deps: AppDependencies): Express {
  const app = express();
  const logger = deps.logger ?? createSilentLogger();
  const metrics = deps.metrics ?? createMetrics();

  app.disable('x-powered-by');
  // Primeiro middleware: o log cobre também erros do parser JSON e 404.
  app.use(requestContext(logger));
  app.use(express.json({ limit: '16kb' }));

  app.use(healthRouter(deps.checkDatabase));
  app.use(metricsRouter(metrics.registry));
  app.use(catalogRouter(deps.catalogService));
  app.use(reservationsRouter(deps.reservationService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
