import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/setup-env.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
