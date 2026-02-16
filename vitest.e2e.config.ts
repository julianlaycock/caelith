import { defineConfig } from 'vitest/config';

/**
 * E2E tests only — requires backend running with NODE_ENV=test ENABLE_TEST_RESET=1
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    include: ['tests/e2e/**/*.test.ts'],
  },
});
