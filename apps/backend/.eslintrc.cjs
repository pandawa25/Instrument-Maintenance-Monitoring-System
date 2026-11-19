/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // tsconfig.json sendiri exclude **/*.spec.ts (sengaja, ts-jest yang handle type-check test
    // secara terpisah via isolatedModules). tsconfig.eslint.json extend config yang sama tapi
    // meng-include spec file supaya ESLint type-aware tetap bisa jalan di file test.
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.cjs', 'dist', 'node_modules', 'coverage'],
  rules: {
    // NestJS banyak memakai decorator metadata & DI tanpa pakai parameter secara langsung.
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
};
