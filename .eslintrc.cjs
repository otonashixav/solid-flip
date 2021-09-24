/** @type {import('@types/eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/ban-types': ["error", {
      types: {
        Function: false
      },
      extendDefaults: true
    }],
  },
  overrides: [
    {
      files: ['*/**.[ts|tsx]']
    }
  ]
};
