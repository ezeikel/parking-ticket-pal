import { Config } from 'jest';
import path from 'path';

const config: Config = {
  rootDir: path.join(__dirname, '..'),
  displayName: 'lint',
  runner: 'jest-runner-eslint',
  testMatch: ['<rootDir>/**/*.+(js|jsx|ts|tsx)'],
  testPathIgnorePatterns: [
    '<rootDir>/.react-email/',
    '<rootDir>/components/ui/',
  ],
};

export default config;
