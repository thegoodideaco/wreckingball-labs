export default {
  rules: {
    'vue/multi-word-component-names': [
      'error',
      {
        ignores: ['Button', 'Header', 'Page', 'Index'],
      },
    ],
    'array-element-newline': ['error', 'always'],
    'array-bracket-newline': [
      'error',
      {
        multiline: true,
        minItems: 3,
      },
    ],
    'array-bracket-spacing': ['error', 'never'],
    indent: ['error', 2],
    quotes: ['error', 'single'],
    'quote-props': ['error', 'as-needed'],
    'prefer-arrow-callback': [
      'error',
      {
        allowNamedFunctions: false,
        allowUnboundThis: true,
      },
    ],
    'vue/no-unused-vars': [
      'error',
      {
        ignorePattern: '^_',
      },
    ],
    // 'no-mixed-spaces-and-tabs': 'error',
    'key-spacing': [
      'error',
      {
        singleLine: {
          beforeColon: false,
          afterColon: true,
        },
        multiLine: {
          beforeColon: false,
          afterColon: true,
        },
        align: {
          beforeColon: false,
          afterColon: true,
          on: 'value',
        },
      },
    ],
    'no-trailing-spaces': [
      2,
      {
        skipBlankLines: false,
      },
    ],
    'comma-spacing': [
      'error',
      {
        before: false,
        after: true,
      },
    ],
    'comma-dangle': ['error', 'always-multiline'],

    semi: ['error', 'never'],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    eqeqeq: ['error', 'smart'],
  },
}
