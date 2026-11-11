/** Experiência do catálogo, como persistida. */
export interface ExperienceRecord {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
}

/** Saída de uma experiência, como persistida (ocupação ainda não derivada). */
export interface DepartureRecord {
  id: string;
  experienceId: string;
  startsAt: Date;
  capacity: number;
  reservedSeats: number;
  priceCents: number;
}

export interface DepartureFilter {
  experienceId?: string;
}

/** Contrato de leitura do catálogo (implementação PostgreSQL ou fake nos testes). */
export interface CatalogRepository {
  /** Experiências em ordem estável: nome e, em empate, id. */
  listExperiences(): Promise<ExperienceRecord[]>;
  /** Saídas em ordem estável: início e, em empate, id. */
  listDepartures(filter: DepartureFilter): Promise<DepartureRecord[]>;
}
