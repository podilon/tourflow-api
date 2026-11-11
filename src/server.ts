import { createApp } from './app.js';
import { loadDbConfig, loadEnv } from './config/env.js';
import { createDatabaseHealthCheck } from './infra/db/health.js';
import { createPool } from './infra/db/pool.js';
import { createPgCatalogRepository } from './repositories/pg/pg-catalog-repository.js';
import { createPgReservationRepository } from './repositories/pg/pg-reservation-repository.js';
import { createCatalogService } from './services/catalog-service.js';
import { createReservationService } from './services/reservation-service.js';

const env = loadEnv();
const pool = createPool(loadDbConfig());
const app = createApp({
  checkDatabase: createDatabaseHealthCheck(pool),
  catalogService: createCatalogService(createPgCatalogRepository(pool)),
  reservationService: createReservationService(createPgReservationRepository(pool)),
});

const server = app.listen(env.PORT, env.HOST, (error?: Error) => {
  if (error) {
    console.error('Failed to start TourFlow API', error);
    process.exit(1);
  }
  console.log(`TourFlow API listening on ${env.HOST}:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}, closing HTTP server`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
