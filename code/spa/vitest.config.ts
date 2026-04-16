import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text-summary', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/api.ts',
        'src/lib/formatters.ts',
        'src/lib/utils.ts',
        'src/hooks/**/*.ts',
        'src/components/transactions/CategoryBadge.tsx',
        'src/components/budgets/BudgetCard.tsx',
        'src/components/goals/GoalCard.tsx',
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/**/__mocks__/**',
        'src/components/ui/**',
      ],
      thresholds: {
        lines: 80,
        functions: 55,
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
