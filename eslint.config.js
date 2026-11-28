import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';

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
    // Accessibility linting (WCAG-oriented). Rules currently passing are
    // enforced as errors; the rest are surfaced as warnings via `npm run
    // lint:a11y` until the remaining debt is fixed.
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      ...Object.fromEntries(
        Object.keys(jsxA11y.configs.recommended.rules).map((r) => [r, 'warn'])
      ),
      // Crashes on this repo's minimatch version; tracked debt, off for now.
      'jsx-a11y/label-has-associated-control': 'off',
      // Already clean across the codebase: enforced as errors to prevent regressions.
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-ambiguous-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/autocomplete-valid': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/iframe-has-title': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/mouse-events-have-key-events': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/scope': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
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
