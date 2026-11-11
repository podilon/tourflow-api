import { createApp } from './app.js';
import { loadDbConfig, loadEnv } from './config/env.js';
import { createDatabaseHealthCheck } from './infra/db/health.js';
import { createPool } from './infra/db/pool.js';
import { createLogger } from './infra/logger.js';
import { createMetrics } from './infra/metrics.js';
import { createPgCatalogRepository } from './repositories/pg/pg-catalog-repository.js';
import { createPgReservationRepository } from './repositories/pg/pg-reservation-repository.js';
import { createCatalogService } from './services/catalog-service.js';
import { createReservationService } from './services/reservation-service.js';

const env = loadEnv();
const logger = createLogger();
const metrics = createMetrics();
const pool = createPool(loadDbConfig());
const app = createApp({
  checkDatabase: createDatabaseHealthCheck(pool),
  catalogService: createCatalogService(createPgCatalogRepository(pool)),
  reservationService: createReservationService(createPgReservationRepository(pool), {
    onConfirmed: metrics.recordReservationConfirmed,
  }),
  logger,
  metrics,
});

const server = app.listen(env.PORT, env.HOST, (error?: Error) => {
  if (error) {
    // Só o código do erro de sistema (ex.: EADDRINUSE), sem o objeto bruto.
    logger.fatal({ errorCode: (error as NodeJS.ErrnoException).code ?? 'START_FAILED' }, 'server start failed');
    process.exit(1);
  }
  logger.info({ host: env.HOST, port: env.PORT, nodeEnv: env.NODE_ENV }, 'server listening');
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'closing HTTP server');
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
