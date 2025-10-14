import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'dist/**',
      '.vercel/**',
      '.svelte-kit/**',
      'static/**',
      'src/lib/__tests__/fixtures/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { sourceType: 'module' }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' }
      ],
      'no-useless-escape': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },
  {
    files: [
      '**/*.config.js',
      '*.cjs',
      'svelte.config.js',
      'tailwind.config.js',
      'vite.config.ts',
      'vitest.config.ts'
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off'
    }
  }
]
