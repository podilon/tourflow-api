import { defineConfig } from 'vitest/config';

/** Integração com PostgreSQL real e isolado (db-test); ver tests/helpers/test-db.ts. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/helpers/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
