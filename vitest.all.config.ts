import { defineConfig } from 'vitest/config';

/**
 * Full test suite — includes e2e tests that require DB reset.
 * Backend must be running with: NODE_ENV=test ENABLE_TEST_RESET=1
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'src/frontend/', '**/*.test.ts'],
    },
  },
});
