import type { NextFunction, Request, Response } from 'express';
import { sendError } from '../send-error.js';

/**
 * Rejeições do parser JSON (body-parser) causadas pela requisição do cliente,
 * identificadas pelo campo `type`. Falhas internas de stream ficam de fora e
 * seguem como 500.
 */
const CLIENT_BODY_ERRORS: ReadonlyMap<string, string> = new Map([
  ['entity.parse.failed', 'Malformed JSON body'],
  ['entity.too.large', 'Request body too large'],
  ['request.size.invalid', 'Request body size mismatch'],
  ['request.aborted', 'Request body aborted'],
  ['encoding.unsupported', 'Unsupported request body encoding'],
  ['charset.unsupported', 'Unsupported request body charset'],
]);

function clientBodyErrorMessage(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('type' in err)) {
    return undefined;
  }
  return typeof err.type === 'string' ? CLIENT_BODY_ERRORS.get(err.type) : undefined;
}

/**
 * Último middleware: converte qualquer falha no contrato de erro do PRD,
 * sem expor mensagem interna nem stack trace na resposta HTTP.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  const clientMessage = clientBodyErrorMessage(err);
  if (clientMessage !== undefined) {
    sendError(res, 400, 'VALIDATION_ERROR', clientMessage);
    return;
  }

  // O objeto de erro (mensagem, stack, SQL) não é logado nem respondido: o
  // log de requisição registra apenas errorCode INTERNAL_ERROR.
  sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
}
