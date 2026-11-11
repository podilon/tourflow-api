import express, { type Express } from 'express';
import { errorHandler } from './http/middlewares/error-handler.js';
import { notFoundHandler } from './http/middlewares/not-found.js';

/** Monta a aplicação sem abrir porta, para uso direto pelo Supertest. */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
