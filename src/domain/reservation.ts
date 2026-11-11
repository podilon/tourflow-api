import { z } from 'zod';

/**
 * Payload de POST /reservations (PRD RF-06). Strict: propriedade desconhecida
 * é rejeitada; `customerName` é aparado antes de medir o tamanho.
 */
export const reservationRequestSchema = z.strictObject({
  departureId: z.uuid(),
  customerName: z.string().trim().min(1).max(120),
  customerEmail: z.email().max(254),
  participants: z.number().int().min(1).max(20),
});

export type ReservationRequest = z.infer<typeof reservationRequestSchema>;

/** Parâmetro de GET /reservations/:id. */
export const reservationIdSchema = z.uuid();

export const RESERVATION_STATUS = 'CONFIRMED';

/**
 * Estado da saída lido sob o bloqueio da transação. `now` vem de
 * clock_timestamp(), lido depois de adquirir o bloqueio.
 */
export interface DepartureSnapshot {
  startsAt: Date;
  capacity: number;
  reservedSeats: number;
  now: Date;
}

export type DomainErrorCode = 'NOT_FOUND' | 'DEPARTURE_CLOSED' | 'NO_AVAILABILITY';

/** Erro de regra de negócio com código estável do contrato HTTP (PRD §5). */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export const departureNotFound = () => new DomainError('NOT_FOUND', 'Departure not found');
export const reservationNotFound = () => new DomainError('NOT_FOUND', 'Reservation not found');
export const departureClosed = () =>
  new DomainError('DEPARTURE_CLOSED', 'Departure is closed for reservations');
export const noAvailability = () =>
  new DomainError('NO_AVAILABILITY', 'Not enough available seats');

export function availableSeats(departure: Pick<DepartureSnapshot, 'capacity' | 'reservedSeats'>): number {
  return departure.capacity - departure.reservedSeats;
}

/**
 * Regras verificadas sob o bloqueio (PRD RF-03 e RF-05): a saída existe, é
 * futura (`starts_at > now`) e tem vagas para todos os participantes.
 */
export function assertReservable(departure: DepartureSnapshot | undefined, participants: number): void {
  if (departure === undefined) throw departureNotFound();
  if (departure.startsAt.getTime() <= departure.now.getTime()) throw departureClosed();
  if (participants > availableSeats(departure)) throw noAvailability();
}
