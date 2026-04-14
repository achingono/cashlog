import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text-summary', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/types.ts',
        'src/lib/seed-categories.ts',
        'src/middleware/**/*.ts',
        'src/routes/**/*.ts',
        'src/services/**/*.ts',
      ],
      exclude: ['src/**/*.test.ts', 'src/**/__tests__/**', 'src/**/__mocks__/**', 'src/index.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
