import { defineConfig } from 'vitest/config';

/** Testes unitários (sem banco). A integração usa vitest.integration.config.ts. */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
