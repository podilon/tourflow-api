import { defineConfig } from 'vitest/config';

/**
 * Testes unitários (sem banco). A integração usa vitest.integration.config.ts.
 * Cobertura (npm run test:coverage): provider v8, restrita ao domínio e aos
 * serviços (PRD RNF-04). Com `include`, arquivos não importados por nenhum
 * teste também entram no relatório, com 0%. O comando falha abaixo do limiar.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts', 'src/services/**/*.ts'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      thresholds: {
        lines: 80,
        branches: 80,
      },
    },
  },
});
