import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Vitest config for parking-ticket-pal-web. Mirrors apps/chunky-crayon-web's
 * vitest setup so the two apps test the same way.
 *
 * Scope: pure logic + (eventually) component tests. We deliberately do NOT
 * try to render React Server Components or exercise Next routing here —
 * that's Playwright's job. Vitest covers the extracted, deterministic
 * logic where a silent bug costs money or breaks the core experience.
 *
 * `@/*` path alias is resolved from tsconfig.json by vite-tsconfig-paths.
 * Server tests (e.g. app/api/**) declare their environment with
 * `// @vitest-environment node` at the top of the file — same pattern CC
 * uses for node-only tests (e.g. jose / node:crypto).
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/vitest.setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      'e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      // Allowlist of files actually under test today. Widen as we add
      // tests; do NOT flip to "everything" or the number becomes noise.
      // (Mirrors CC's coverage discipline.)
      include: [
        'app/api/iap/confirm-draft/route.ts',
        'app/api/iap/confirm-purchase/route.ts',
      ],
    },
  },
});
