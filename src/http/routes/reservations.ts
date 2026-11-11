import { Router } from 'express';
import type { ReservationService } from '../../services/reservation-service.js';
import { createReservationController } from '../controllers/reservation-controller.js';

/**
 * POST /reservations e GET /reservations/:id (PRD RF-03 a RF-06). Falhas
 * inesperadas chegam ao errorHandler (Express 5 encaminha rejeições) e viram 500.
 */
export function reservationsRouter(service: ReservationService): Router {
  const controller = createReservationController(service);
  const router = Router();

  router.post('/reservations', controller.create);
  router.get('/reservations/:id', controller.get);

  return router;
}
