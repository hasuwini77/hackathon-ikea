import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()] as any,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./app/lib/couchbase/hooks/__tests__/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    // Isolate tests to prevent state leakage
    isolate: true,
    // Pool settings for React 19 compatibility
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/lib/couchbase/hooks/**/*.ts'],
      exclude: ['app/lib/couchbase/hooks/**/*.test.ts', 'app/lib/couchbase/hooks/__tests__/**'],
    },
  },
});
