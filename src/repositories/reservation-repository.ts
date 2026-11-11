import type { DepartureSnapshot } from '../domain/reservation.js';

export interface NewReservation {
  departureId: string;
  customerName: string;
  customerEmail: string;
  participants: number;
}

/** Reserva persistida, sem nome nem e-mail (não são devolvidos pela API). */
export interface ReservationRecord {
  id: string;
  departureId: string;
  participants: number;
  status: string;
  createdAt: Date;
}

/**
 * Verificação executada dentro da transação, com a saída bloqueada.
 * Lança erro para abortar (rollback); `undefined` indica saída inexistente.
 */
export type ReservationGuard = (departure: DepartureSnapshot | undefined) => void;

/** Contrato de escrita e leitura de reservas (PostgreSQL ou fake nos testes). */
export interface ReservationRepository {
  /** Bloqueia a saída, executa `guard`, grava a reserva e ocupa as vagas atomicamente. */
  create(input: NewReservation, guard: ReservationGuard): Promise<ReservationRecord>;
  findById(id: string): Promise<ReservationRecord | undefined>;
}
