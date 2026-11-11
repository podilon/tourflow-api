import type { Request, Response } from 'express';
import { sendError } from '../send-error.js';

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', 'Resource not found');
}
