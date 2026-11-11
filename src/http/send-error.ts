import type { Response } from 'express';

/**
 * Envia o contrato de erro do PRD e registra o código em `res.locals`,
 * de onde o log de requisição lê o `errorCode` (sem a mensagem nem o erro).
 */
export function sendError(res: Response, status: number, code: string, message: string): void {
  res.locals.errorCode = code;
  res.status(status).json({ error: { code, message } });
}
