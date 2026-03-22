import type { Config } from 'jest';
import nextJest from 'next/jest';
import common from './jest.common';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  ...common,
  displayName: 'server',
  coverageProvider: 'v8',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/app/api/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

export default createJestConfig(config as any);
