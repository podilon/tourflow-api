-- 0001_demo_catalog: catálogo sintético e fictício (nenhum dado real).
-- IDs, nomes, capacidades e preços fixos. Idempotente: ON CONFLICT DO NOTHING
-- só insere registros ausentes e nunca altera linhas existentes, reservas nem
-- reserved_seats. Executada por src/infra/db/seed.ts dentro de uma transação.
--
-- Datas relativas à execução: CURRENT_DATE + N + TIME '09:00' (date + integer
-- = date; date + time = timestamp). O fuso é fixado em UTC nesta transação,
-- portanto cada saída começa às 09:00 UTC, N dias após a data UTC da execução.
SET LOCAL TIME ZONE 'UTC';

INSERT INTO experiences (id, name, description, duration_minutes) VALUES
  ('8f0c2a1e-1b6d-4c1a-9a51-0d2b6f1e7a01', 'Passeio de barco fictício pela baía',
   'Experiência sintética para demonstração do TourFlow API.', 180),
  ('8f0c2a1e-1b6d-4c1a-9a51-0d2b6f1e7a02', 'Trilha fictícia ao mirante',
   'Experiência sintética para demonstração do TourFlow API.', 240)
ON CONFLICT (id) DO NOTHING;

INSERT INTO departures (id, experience_id, starts_at, capacity, reserved_seats, price_cents) VALUES
  ('3c9e7b52-6a0f-4d8e-8b1c-5f2a9d4e6b01', '8f0c2a1e-1b6d-4c1a-9a51-0d2b6f1e7a01',
   CURRENT_DATE + 7 + TIME '09:00', 12, 0, 18900),
  ('3c9e7b52-6a0f-4d8e-8b1c-5f2a9d4e6b02', '8f0c2a1e-1b6d-4c1a-9a51-0d2b6f1e7a01',
   CURRENT_DATE + 14 + TIME '09:00', 12, 0, 18900),
  ('3c9e7b52-6a0f-4d8e-8b1c-5f2a9d4e6b03', '8f0c2a1e-1b6d-4c1a-9a51-0d2b6f1e7a02',
   CURRENT_DATE + 10 + TIME '09:00', 8, 0, 9900),
  ('3c9e7b52-6a0f-4d8e-8b1c-5f2a9d4e6b04', '8f0c2a1e-1b6d-4c1a-9a51-0d2b6f1e7a02',
   CURRENT_DATE + 21 + TIME '09:00', 8, 0, 9900)
ON CONFLICT (id) DO NOTHING;
