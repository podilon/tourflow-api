import type {
  CatalogRepository,
  DepartureFilter,
  DepartureRecord,
  ExperienceRecord,
} from '../repositories/catalog-repository.js';

export type Experience = ExperienceRecord;

/** Saída exposta pela API: início em ISO 8601 UTC e vagas derivadas. */
export interface Departure {
  id: string;
  experienceId: string;
  startsAt: string;
  capacity: number;
  availableSeats: number;
  priceCents: number;
}

export interface CatalogService {
  listExperiences(): Promise<Experience[]>;
  listDepartures(filter: DepartureFilter): Promise<Departure[]>;
}

export function toDeparture(record: DepartureRecord): Departure {
  return {
    id: record.id,
    experienceId: record.experienceId,
    startsAt: record.startsAt.toISOString(),
    capacity: record.capacity,
    availableSeats: record.capacity - record.reservedSeats,
    priceCents: record.priceCents,
  };
}

export function createCatalogService(repository: CatalogRepository): CatalogService {
  return {
    listExperiences: () => repository.listExperiences(),
    async listDepartures(filter) {
      const records = await repository.listDepartures(filter);
      return records.map(toDeparture);
    },
  };
}
