// base.mjs
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import onlyWarn from 'eslint-plugin-only-warn';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReact from 'eslint-plugin-react';
import pluginNext from '@next/eslint-plugin-next';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...compat.extends('airbnb-base'),
  eslintConfigPrettier,
  {
    plugins: {
      onlyWarn,
      'jsx-a11y': jsxA11y,
      '@next/next': pluginNext,
      'react-hooks': pluginReactHooks,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
      ...pluginReactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.jest,
        ...globals.serviceworker,
      },
    },
  },
  {
    settings: {
      'import/resolver': {
        typescript: {
          project: [
            'tsconfig.json',
            'apps/*/tsconfig.json',
            'packages/*/tsconfig.json',
            'configs/*/tsconfig.json',
          ],
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
          moduleDirectory: [
            'node_modules',
            '../../packages/',
            '../../apps/',
            '../../configs/',
          ],
        },
      },
      react: { version: 'detect' },
      next: {
        rootDir: '.',
      },
    },
    rules: {
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
          optionalDependencies: false,
          peerDependencies: false,
          includeTypes: true,
          packageDir: ['.', '../..'],
        },
      ],
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          js: 'never',
          jsx: 'never',
          ts: 'never',
          tsx: 'never',
        },
      ],
    },
  },
];
