import type { Request, Response } from 'express';
import {
  DomainError,
  reservationIdSchema,
  reservationRequestSchema,
  type DomainErrorCode,
} from '../../domain/reservation.js';
import type { ReservationService } from '../../services/reservation-service.js';
import { sendError } from '../send-error.js';

const STATUS_BY_CODE: Readonly<Record<DomainErrorCode, number>> = {
  NOT_FOUND: 404,
  DEPARTURE_CLOSED: 409,
  NO_AVAILABILITY: 409,
};

function sendValidationError(res: Response, message: string): void {
  // Mensagem fixa: a entrada recebida não é ecoada.
  sendError(res, 400, 'VALIDATION_ERROR', message);
}

/** Erros de regra viram 404/409; os demais seguem ao errorHandler (500). */
function sendDomainError(res: Response, error: unknown): void {
  if (!(error instanceof DomainError)) throw error;
  sendError(res, STATUS_BY_CODE[error.code], error.code, error.message);
}

export interface ReservationController {
  create(req: Request, res: Response): Promise<void>;
  get(req: Request, res: Response): Promise<void>;
}

export function createReservationController(service: ReservationService): ReservationController {
  return {
    async create(req, res) {
      const parsed = reservationRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        sendValidationError(res, 'Invalid reservation payload');
        return;
      }
      try {
        const reservation = await service.create(parsed.data);
        res.status(201).location(`/reservations/${reservation.id}`).json(reservation);
      } catch (error) {
        sendDomainError(res, error);
      }
    },
    async get(req, res) {
      const parsed = reservationIdSchema.safeParse(req.params.id);
      if (!parsed.success) {
        sendValidationError(res, 'Invalid reservation id');
        return;
      }
      try {
        res.status(200).json(await service.get(parsed.data));
      } catch (error) {
        sendDomainError(res, error);
      }
    },
  };
}
