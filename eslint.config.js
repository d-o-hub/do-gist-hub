import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/**
 * ESLint Flat Config for d.o. Gist Hub (2026 Best Practices)
 * Uses defineConfig for clean configuration composition
 * Reference: https://typescript-eslint.io/getting-started/
 * Reference: https://eslint.org/docs/latest/use/configure/configuration-files
 */
export default tseslint.config(
  // Global ignores - skip scanning unnecessary directories
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'android/**',
      'ios/**',
      '*.config.ts',
      '*.config.js',
    ],
  },

  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript recommended rules for .ts files
  ...tseslint.configs.recommended,

  // TypeScript files configuration
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript strict rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],

      // Promise handling - warn for existing codebase, error for new code
      'require-await': 'error',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',

      // Code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
    },
  },

  // Test files - relaxed rules
  {
    files: ['tests/**/*.ts', 'tests/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  }
);
