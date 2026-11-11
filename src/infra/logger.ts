import { pino, type DestinationStream, type Logger } from 'pino';

export type AppLogger = Logger;

/**
 * Logger JSON (uma linha por evento) no stdout. Sem `pid`/`hostname`
 * (`base: null`) e com horário ISO 8601. O destino é injetável para testes.
 */
export function createLogger(destination?: DestinationStream): AppLogger {
  const options = { base: null, timestamp: pino.stdTimeFunctions.isoTime };
  return destination === undefined ? pino(options) : pino(options, destination);
}

/** Logger desligado: padrão do createApp quando nenhum é injetado (testes). */
export function createSilentLogger(): AppLogger {
  return pino({ enabled: false });
}
