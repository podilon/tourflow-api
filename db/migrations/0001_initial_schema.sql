-- 0001_initial_schema: catálogo, saídas e reservas com a invariante de capacidade.
-- Executada por src/infra/db/migrate.ts dentro de uma transação, sob advisory lock,
-- somente uma vez (registro em schema_migrations). Não contém DDL destrutiva.

CREATE TABLE experiences (
  id               uuid    PRIMARY KEY,
  name             text    NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description      text    NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0)
);

CREATE TABLE departures (
  id             uuid        PRIMARY KEY,
  experience_id  uuid        NOT NULL REFERENCES experiences (id),
  starts_at      timestamptz NOT NULL,
  capacity       integer     NOT NULL CHECK (capacity > 0),
  reserved_seats integer     NOT NULL DEFAULT 0 CHECK (reserved_seats >= 0),
  price_cents    integer     NOT NULL CHECK (price_cents >= 0),
  -- Invariante do PRD §4: 0 <= reserved_seats <= capacity.
  CONSTRAINT departures_reserved_seats_within_capacity CHECK (reserved_seats <= capacity)
);

CREATE INDEX departures_experience_id_starts_at_idx ON departures (experience_id, starts_at);

CREATE TABLE reservations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id   uuid        NOT NULL REFERENCES departures (id),
  customer_name  text        NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 120),
  customer_email text        NOT NULL CHECK (char_length(customer_email) BETWEEN 3 AND 254),
  participants   integer     NOT NULL CHECK (participants BETWEEN 1 AND 20),
  status         text        NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reservations_departure_id_idx ON reservations (departure_id);
