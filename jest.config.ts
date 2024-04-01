import { Config } from 'jest';

const config: Config = {
  coverageThreshold: {
    global: {
      statements: 34,
      branches: 24,
      functions: 29,
      lines: 29,
    },
  },
  projects: ['./test/jest.lint.ts', './test/jest.client.ts'],
};

export default config;
