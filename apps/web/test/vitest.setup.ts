// Vitest setup — runs before every test file. Mirrors CC's pattern.
// PTP's tests today are server-route logic (node env via the
// `// @vitest-environment node` pragma at the top of each test file),
// no React component rendering yet. When component tests are added,
// re-introduce @testing-library/react and an afterEach(cleanup) block
// like apps/chunky-crayon-web/test/vitest.setup.ts does.
import '@testing-library/jest-dom/vitest';
