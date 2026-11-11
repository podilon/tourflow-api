import { Counter, Registry } from 'prom-client';

export interface AppMetrics {
  registry: Registry;
  /** Conta uma reserva confirmada. Nunca lança: falha de métrica não vira erro HTTP. */
  recordReservationConfirmed(): void;
}

/**
 * Registry próprio (não o global do prom-client), para que cada instância
 * da aplicação — e cada teste — tenha contadores isolados.
 */
export function createMetrics(): AppMetrics {
  const registry = new Registry();
  const reservationsConfirmed = new Counter({
    name: 'tourflow_reservations_confirmed_total',
    help: 'Reservas confirmadas e gravadas no banco (após COMMIT).',
    registers: [registry],
  });

  return {
    registry,
    recordReservationConfirmed() {
      try {
        reservationsConfirmed.inc();
      } catch {
        // A reserva já foi confirmada; a instrumentação é secundária.
      }
    },
  };
}
