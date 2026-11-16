module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true
  },
  globals: {
    wx: 'readonly',
    App: 'readonly',
    Page: 'readonly',
    Component: 'readonly',
    Behavior: 'readonly',
    getApp: 'readonly',
    getCurrentPages: 'readonly',
    requirePlugin: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script'
  },
  rules: {
    'no-var': 'error',
    'prefer-const': 'error',
    eqeqeq: ['error', 'always'],
    'no-unused-vars': ['warn', { args: 'none' }],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    semi: ['error', 'never'],
    quotes: ['error', 'single', { avoidEscape: true }]
  }
}
