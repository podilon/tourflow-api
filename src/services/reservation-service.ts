import {
  assertReservable,
  reservationNotFound,
  type ReservationRequest,
} from '../domain/reservation.js';
import type { ReservationRecord, ReservationRepository } from '../repositories/reservation-repository.js';

/** Reserva exposta pela API: sem nome nem e-mail; `createdAt` em ISO 8601 UTC. */
export interface Reservation {
  id: string;
  departureId: string;
  participants: number;
  status: string;
  createdAt: string;
}

export interface ReservationService {
  create(request: ReservationRequest): Promise<Reservation>;
  get(id: string): Promise<Reservation>;
}

export function toReservation(record: ReservationRecord): Reservation {
  return {
    id: record.id,
    departureId: record.departureId,
    participants: record.participants,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
  };
}

export function createReservationService(repository: ReservationRepository): ReservationService {
  return {
    async create(request) {
      const record = await repository.create(request, (departure) =>
        assertReservable(departure, request.participants),
      );
      return toReservation(record);
    },
    async get(id) {
      const record = await repository.findById(id);
      if (record === undefined) throw reservationNotFound();
      return toReservation(record);
    },
  };
}
