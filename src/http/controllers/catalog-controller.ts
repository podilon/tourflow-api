import type { Request, Response } from 'express';
import { z } from 'zod';
import type { CatalogService } from '../../services/catalog-service.js';

/**
 * Filtro de GET /departures. Strict: parâmetro desconhecido, repetido (array),
 * vazio ou fora do formato UUID é rejeitado.
 */
const departuresQuerySchema = z.strictObject({
  experienceId: z.uuid().optional(),
});

export interface CatalogController {
  listExperiences(req: Request, res: Response): Promise<void>;
  listDepartures(req: Request, res: Response): Promise<void>;
}

export function createCatalogController(service: CatalogService): CatalogController {
  return {
    async listExperiences(_req, res) {
      res.status(200).json(await service.listExperiences());
    },
    async listDepartures(req, res) {
      const parsed = departuresQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        // Mensagem fixa: a entrada recebida não é ecoada.
        res
          .status(400)
          .json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters' } });
        return;
      }
      res.status(200).json(await service.listDepartures(parsed.data));
    },
  };
}
