import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 60_000,
    hookTimeout: 120_000,
    env: { NODE_ENV: 'test', JWT_SECRET: 'test-secret-test-secret-123', MONGODB_URI: 'mongodb://placeholder' },
  },
});
