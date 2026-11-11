import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().trim().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export type Env = z.infer<typeof envSchema>;

const dbConfigSchema = z.object({
  DB_HOST: z.string().trim().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535),
  DB_NAME: z.string().trim().min(1),
  DB_USER: z.string().trim().min(1),
  DB_PASSWORD: z.string().min(1),
});

/** Parâmetros discretos de conexão; não há connection string. */
export interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * Variáveis lidas implicitamente pelo `pg` (PGOPTIONS, PGHOST, PGSSLMODE...)
 * ou por convenção (DATABASE_URL) poderiam redirecionar a conexão ou alterar
 * parâmetros da sessão. São rejeitadas em vez de ignoradas.
 */
function connectionOverrides(source: NodeJS.ProcessEnv): string[] {
  return Object.keys(source)
    .filter((name) => /^PG/i.test(name) || name.toUpperCase() === 'DATABASE_URL')
    .sort();
}

function parseOrThrow<T>(schema: z.ZodType<T>, source: NodeJS.ProcessEnv): T {
  const result = schema.safeParse(source);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Invalid environment configuration: ${fields.join(', ')}`);
  }
  return result.data;
}

/**
 * Valida a configuração do processo. Falha explicitamente com os nomes das
 * variáveis inválidas, sem reproduzir os valores recebidos.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return parseOrThrow(envSchema, source);
}

/**
 * Valida a configuração do PostgreSQL. Mensagens citam apenas nomes de
 * variáveis, nunca valores (a senha não aparece em erros nem em logs).
 */
export function loadDbConfig(source: NodeJS.ProcessEnv = process.env): DbConfig {
  const overrides = connectionOverrides(source);
  if (overrides.length > 0) {
    throw new Error(`Unsupported connection override variables: ${overrides.join(', ')}`);
  }
  const parsed = parseOrThrow(dbConfigSchema, source);
  return {
    host: parsed.DB_HOST,
    port: parsed.DB_PORT,
    database: parsed.DB_NAME,
    user: parsed.DB_USER,
    password: parsed.DB_PASSWORD,
  };
}
