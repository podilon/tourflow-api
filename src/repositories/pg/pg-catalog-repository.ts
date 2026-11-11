import type {
  CatalogRepository,
  DepartureFilter,
  DepartureRecord,
  ExperienceRecord,
} from '../catalog-repository.js';

interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}

const LIST_EXPERIENCES_SQL = `
  SELECT id, name, description, duration_minutes AS "durationMinutes"
  FROM experiences
  ORDER BY name, id`;

// O filtro é sempre um parâmetro ($1); NULL significa "sem filtro".
const LIST_DEPARTURES_SQL = `
  SELECT id,
         experience_id  AS "experienceId",
         starts_at      AS "startsAt",
         capacity,
         reserved_seats AS "reservedSeats",
         price_cents    AS "priceCents"
  FROM departures
  WHERE $1::uuid IS NULL OR experience_id = $1::uuid
  ORDER BY starts_at, id`;

/** Repositório somente leitura do catálogo sobre o pool do `pg`. */
export function createPgCatalogRepository(db: Queryable): CatalogRepository {
  return {
    async listExperiences() {
      const { rows } = await db.query(LIST_EXPERIENCES_SQL);
      return rows as ExperienceRecord[];
    },
    async listDepartures(filter: DepartureFilter) {
      const { rows } = await db.query(LIST_DEPARTURES_SQL, [filter.experienceId ?? null]);
      return rows as DepartureRecord[];
    },
  };
}
