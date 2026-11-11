import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AppLogger } from '../../infra/logger.js';

export const REQUEST_ID_HEADER = 'X-Request-Id';

/** Padrão da rota que atendeu (ex.: `/reservations/:id`), nunca a URL bruta. */
function routePattern(req: Request): string {
  const path: unknown = req.route?.path;
  return typeof path === 'string' ? `${req.baseUrl}${path}` : 'unmatched';
}

function levelFor(statusCode: number): 'info' | 'warn' | 'error' {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

/**
 * Gera o request ID na API (o cabeçalho recebido do cliente é ignorado),
 * devolve-o em `X-Request-Id` e escreve uma linha de log ao fim da resposta,
 * somente com campos explícitos: sem URL, query, corpo ou dados de clientes.
 */
export function requestContext(logger: AppLogger): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const startedAt = process.hrtime.bigint();
    res.locals.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    res.once('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const errorCode: unknown = res.locals.errorCode;
      logger[levelFor(res.statusCode)](
        {
          requestId,
          method: req.method,
          route: routePattern(req),
          statusCode: res.statusCode,
          durationMs: Math.round(durationMs * 1000) / 1000,
          ...(typeof errorCode === 'string' ? { errorCode } : {}),
        },
        'request completed',
      );
    });

    next();
  };
}
