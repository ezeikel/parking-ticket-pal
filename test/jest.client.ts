import type { Config } from 'jest';
import nextJest from 'next/jest';
import common from './jest.common';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  ...common,
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
