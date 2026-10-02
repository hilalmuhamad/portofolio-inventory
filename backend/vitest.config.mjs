import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './tests/globalSetup.mjs',
    setupFiles: './tests/setup.mjs',
    fileParallelism: false,
    hookTimeout: 120000,
    testTimeout: 30000,
  },
});
