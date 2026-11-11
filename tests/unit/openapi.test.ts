import { fileURLToPath } from 'node:url';
import SwaggerParser from '@apidevtools/swagger-parser';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { reservationRequestSchema } from '../../src/domain/reservation.js';
import type { ReservationRepository } from '../../src/repositories/reservation-repository.js';
import { createReservationService } from '../../src/services/reservation-service.js';

const SPEC_PATH = fileURLToPath(new URL('../../docs/openapi.yaml', import.meta.url));

type Json = Record<string, unknown>;

/** Coleta todos os valores de `$ref` do documento bruto (antes da resolução). */
function collectRefs(node: unknown, refs: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, refs);
  } else if (typeof node === 'object' && node !== null) {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') refs.push(value);
      else collectRefs(value, refs);
    }
  }
  return refs;
}

/** Documento dereferenciado (cópia nova a cada chamada). */
async function dereferenced(): Promise<Json> {
  return (await SwaggerParser.dereference(SPEC_PATH)) as unknown as Json;
}

const get = (node: unknown, ...path: string[]): Json =>
  path.reduce<unknown>((acc, key) => (acc as Json)[key], node) as Json;

function appWithFixedReservation() {
  const repository: ReservationRepository = {
    create: vi.fn(async (input) => ({
      id: '5d1f0a3b-9c2e-4f6a-8b7d-1e2f3a4b5c6d',
      departureId: input.departureId,
      participants: input.participants,
      status: 'CONFIRMED',
      createdAt: new Date('2026-11-11T12:00:01.234Z'),
    })),
    findById: vi.fn(async () => undefined),
  };
  return createApp({
    checkDatabase: async () => undefined,
    catalogService: { listExperiences: async () => [], listDepartures: async () => [] },
    reservationService: createReservationService(repository),
  });
}

describe('docs/openapi.yaml (F3-T4)', () => {
  it('é um documento OpenAPI 3.1 válido segundo o swagger-parser', async () => {
    const api = (await SwaggerParser.validate(SPEC_PATH)) as unknown as Json;

    expect(api.openapi).toBe('3.1.0');
  });

  it('usa somente referências locais (#/...)', async () => {
    const raw = await SwaggerParser.parse(SPEC_PATH);
    const refs = collectRefs(raw);

    expect(refs.length).toBeGreaterThan(0);
    expect(refs.filter((ref) => !ref.startsWith('#/'))).toEqual([]);
  });

  it('documenta POST /reservations e GET /reservations/{id} com os status da API', async () => {
    const paths = get(await dereferenced(), 'paths');

    expect(Object.keys(get(paths, '/reservations', 'post', 'responses')).sort()).toEqual(
      ['201', '400', '404', '409', '500'],
    );
    expect(Object.keys(get(paths, '/reservations/{id}', 'get', 'responses')).sort()).toEqual(
      ['200', '400', '404', '500'],
    );
  });

  it('o exemplo de requisição é aceito pelo schema Zod da API', async () => {
    const example = get(
      await dereferenced(),
      'paths', '/reservations', 'post', 'requestBody', 'content', 'application/json', 'examples', 'valid',
    ).value;

    expect(reservationRequestSchema.safeParse(example).success).toBe(true);
  });

  it('o schema ReservationRequest espelha os limites do Zod', async () => {
    const schema = get(await dereferenced(), 'components', 'schemas', 'ReservationRequest');
    const props = schema.properties as Record<string, Json>;

    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(['departureId', 'customerName', 'customerEmail', 'participants']);
    expect(props.customerName).toMatchObject({ minLength: 1, maxLength: 120 });
    expect(props.customerEmail).toMatchObject({ maxLength: 254 });
    expect(props.participants).toMatchObject({ type: 'integer', minimum: 1, maximum: 20 });
  });

  it('a resposta 201 real tem exatamente as propriedades do schema Reservation', async () => {
    const api = await dereferenced();
    const schema = get(api, 'components', 'schemas', 'Reservation');
    const example = get(api, 'components', 'examples', 'ConfirmedReservation').value as Json;

    const response = await request(appWithFixedReservation()).post('/reservations').send({
      departureId: example.departureId,
      customerName: 'Cliente Ficticio',
      customerEmail: 'cliente.ficticio@example.test',
      participants: 2,
    });

    expect(response.status).toBe(201);
    expect(Object.keys(response.body).sort()).toEqual([...(schema.required as string[])].sort());
    expect(Object.keys(schema.properties as Json).sort()).toEqual(Object.keys(response.body).sort());
    expect(response.body).toEqual(example);
    expect(response.headers.location).toBe(`/reservations/${example.id}`);
  });

  it('os códigos de erro de exemplo pertencem ao enum do ErrorResponse', async () => {
    const api = await dereferenced();
    const codes = get(api, 'components', 'schemas', 'ErrorResponse', 'properties', 'error', 'properties', 'code')
      .enum as string[];
    const exampleCodes = JSON.stringify(api.paths).match(/"code":"[A-Z_]+"/g) ?? [];

    expect(exampleCodes.length).toBeGreaterThan(0);
    for (const entry of exampleCodes) {
      expect(codes).toContain(entry.slice('"code":"'.length, -1));
    }
  });
});
