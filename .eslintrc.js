module.exports = {
  root: true,
  ignorePatterns: ['**/node_modules/**', '**/dist/**'],
  overrides: [
    {
      files: ['*.ts'],
      parserOptions: {
        project: ['tsconfig.json'],
        tsconfigRootDir: __dirname,
        createDefaultProgram: true,
      },
      extends: [
        '@angular-eslint/recommended',
        '@angular-eslint/template/process-inline-templates',
        'eslint:recommended',
        '@typescript-eslint/recommended',
      ],
      rules: {
        '@angular-eslint/directive-selector': [
          'error',
          {
            type: 'attribute',
            prefix: 'app',
            style: 'camelCase',
          },
        ],
        '@angular-eslint/component-selector': [
          'error',
          {
            type: 'element',
            prefix: 'app',
            style: 'kebab-case',
          },
        ],
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'error',
        'prefer-const': 'error',
        'no-var': 'error',
      },
    },
    {
      files: ['*.html'],
      extends: ['@angular-eslint/template/recommended'],
      rules: {},
    },
  ],
};
