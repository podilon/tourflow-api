import type { NextFunction, Request, Response } from 'express';

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
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: clientMessage } });
    return;
  }

  // Mensagem fixa, sem o objeto de erro (que pode conter dados internos).
  // Logs estruturados com Pino chegam na F3-T1.
  console.error('Unexpected error while handling request');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}
