import { Config } from 'jest';
import path from 'path';

const config: Config = {
  rootDir: path.join(__dirname, '..'),
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/'],
  watchPlugins: [
    'jest-watch-select-projects',
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};

export default config;
