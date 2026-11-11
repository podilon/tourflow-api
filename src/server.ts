import { createApp } from './app.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();
const app = createApp();

const server = app.listen(env.PORT, env.HOST, (error?: Error) => {
  if (error) {
    console.error('Failed to start TourFlow API', error);
    process.exit(1);
  }
  console.log(`TourFlow API listening on ${env.HOST}:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}, closing HTTP server`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
