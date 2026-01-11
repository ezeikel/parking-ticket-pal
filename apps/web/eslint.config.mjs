import next from 'eslint-config-next';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import path from 'node:path';

import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import { configs, plugins } from 'eslint-config-airbnb-extended';
import { rules as prettierConfigRules } from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export const projectRoot = path.resolve('.');
export const gitignorePath = path.resolve(projectRoot, '.gitignore');

const jsConfig = [
  // eslint recommended rules
  {
    name: 'js/config',
    ...js.configs.recommended,
  },
  // stylistic plugin
  plugins.stylistic,
  // import x plugin
  plugins.importX,
  // airbnb base recommended config
  ...configs.base.recommended,
];

const typescriptConfig = [
  // typescript eslint plugin
  plugins.typescriptEslint,
  // airbnb base typescript config
  ...configs.base.typescript,
];

const prettierConfig = [
  // prettier plugin
  {
    name: 'prettier/plugin/config',
    plugins: {
      prettier: prettierPlugin,
    },
  },
  // prettier config
  {
    name: 'prettier/config',
    rules: {
      ...prettierConfigRules,
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react/require-default-props': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/ui/**', 'next-auth.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'react/function-component-definition': 'off',
    },
  },
  {
    files: ['**/components/ui/**'],
    rules: {
      'arrow-body-style': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'import-x/prefer-default-export': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-arrow-callback': 'off',
    },
  },
];

export default [
  // Next.js configs (includes react, react-hooks, jsx-a11y, next plugins)
  ...next,
  ...nextCoreWebVitals,
  ...nextTypescript,
  // ignore .gitignore files/folder in eslint
  includeIgnoreFile(gitignorePath),
  // javascript config
  ...jsConfig,
  // typescript config
  ...typescriptConfig,
  // prettier config
  ...prettierConfig,
  // Settings and rule overrides for Next.js projects
  {
    settings: {
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: true,
      },
    },
    rules: {
      // Disable extension requirement for TypeScript files
      'import-x/extensions': [
        'error',
        'ignorePackages',
        {
          ts: 'never',
          tsx: 'never',
          js: 'never',
          jsx: 'never',
        },
      ],
      // Disable no-unresolved for path aliases (handled by TypeScript)
      'import-x/no-unresolved': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
  },
];
