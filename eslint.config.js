import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  // shadcn/ui components are generated code; they are still type-checked by `tsc -b`.
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results', 'src/components/ui']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['src/test/**', '**/*.test.{ts,tsx}', 'e2e/**', '*.config.ts'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['e2e/**', '*.config.{ts,js}'],
    languageOptions: { globals: globals.node },
  },
  prettier,
])
