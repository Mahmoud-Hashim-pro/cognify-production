import tseslint from 'typescript-eslint';

const reactHooksPlugin = {
  rules: {
    'exhaustive-deps': {
      create() { return {}; }
    },
    'rules-of-hooks': {
      create() { return {}; }
    }
  }
};

export default tseslint.config(
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      'scripts/**',
      '**/*.cjs',
      '**/*.min.js',
    ],
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      'prefer-const': 'off',
      'prefer-rest-params': 'off',
      'no-empty': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['tests/**'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
