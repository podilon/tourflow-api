import { DomainError, type DepartureSnapshot } from '../../domain/reservation.js';
import type {
  NewReservation,
  ReservationGuard,
  ReservationRecord,
  ReservationRepository,
} from '../reservation-repository.js';

interface QueryResultLike {
  rows: unknown[];
}

export interface TransactionClient {
  query(text: string, values?: unknown[]): Promise<QueryResultLike>;
  /** `release(true)` (ou um erro) descarta a conexão em vez de devolvê-la ao pool. */
  release(destroy?: boolean | Error): void;
}

export interface ReservationPool {
  connect(): Promise<TransactionClient>;
  query(text: string, values?: unknown[]): Promise<QueryResultLike>;
}

/**
 * Limites da transação de reserva (ADR-0001: timeout explícito). A ordem
 * lock (1,5 s) < statement (1,8 s) < query_timeout do cliente (2 s) faz o
 * servidor cancelar antes do cliente, mantendo a conexão em estado conhecido;
 * o limite de ociosidade (5 s) encerra uma transação abandonada pelo processo.
 */
export const TRANSACTION_SETTINGS_SQL = [
  "SET LOCAL lock_timeout = '1500ms'",
  "SET LOCAL statement_timeout = '1800ms'",
  "SET LOCAL idle_in_transaction_session_timeout = '5s'",
];

export const LOCK_DEPARTURE_SQL = `
  SELECT starts_at      AS "startsAt",
         capacity,
         reserved_seats AS "reservedSeats"
  FROM departures
  WHERE id = $1
  FOR UPDATE`;

// Lido em consulta própria, depois do bloqueio: now() seria o início da transação.
export const CLOCK_SQL = 'SELECT clock_timestamp() AS now';

const RESERVATION_COLUMNS = `
  id,
  departure_id AS "departureId",
  participants,
  status,
  created_at   AS "createdAt"`;

export const INSERT_RESERVATION_SQL = `
  INSERT INTO reservations (departure_id, customer_name, customer_email, participants, status)
  VALUES ($1, $2, $3, $4, 'CONFIRMED')
  RETURNING ${RESERVATION_COLUMNS}`;

export const OCCUPY_SEATS_SQL = `
  UPDATE departures
  SET reserved_seats = reserved_seats + $2
  WHERE id = $1`;

export const FIND_RESERVATION_SQL = `
  SELECT ${RESERVATION_COLUMNS}
  FROM reservations
  WHERE id = $1`;

async function lockDeparture(
  client: TransactionClient,
  departureId: string,
): Promise<DepartureSnapshot | undefined> {
  const locked = await client.query(LOCK_DEPARTURE_SQL, [departureId]);
  const row = locked.rows[0] as Omit<DepartureSnapshot, 'now'> | undefined;
  if (row === undefined) return undefined;
  const clock = await client.query(CLOCK_SQL);
  const { now } = clock.rows[0] as { now: Date };
  return { ...row, now };
}

/**
 * Reserva numa única conexão e transação: bloqueia a saída, lê o relógio,
 * verifica as regras, insere a reserva, ocupa as vagas e confirma.
 */
export function createPgReservationRepository(pool: ReservationPool): ReservationRepository {
  return {
    async create(input: NewReservation, guard: ReservationGuard) {
      const client = await pool.connect();
      // Só uma regra de negócio com rollback confirmado devolve a conexão ao pool.
      let reusable = false;
      try {
        await client.query('BEGIN');
        for (const sql of TRANSACTION_SETTINGS_SQL) await client.query(sql);
        guard(await lockDeparture(client, input.departureId));
        const inserted = await client.query(INSERT_RESERVATION_SQL, [
          input.departureId,
          input.customerName,
          input.customerEmail,
          input.participants,
        ]);
        await client.query(OCCUPY_SEATS_SQL, [input.departureId, input.participants]);
        await client.query('COMMIT');
        reusable = true;
        return inserted.rows[0] as ReservationRecord;
      } catch (error) {
        const rolledBack = await client.query('ROLLBACK').then(
          () => true,
          () => false,
        );
        reusable = rolledBack && error instanceof DomainError;
        throw error;
      } finally {
        client.release(!reusable);
      }
    },

    async findById(id: string) {
      const { rows } = await pool.query(FIND_RESERVATION_SQL, [id]);
      return rows[0] as ReservationRecord | undefined;
    },
  };
}
