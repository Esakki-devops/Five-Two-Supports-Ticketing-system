import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/server.ts', 'src/worker.ts'],
    },
  },
});
