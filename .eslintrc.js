module.exports = {
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
  rules: {
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    eqeqeq: 'error',
    'no-default-export': true,
  },
  env: {
    browser: true,
  },
  globals: {
    chrome: true,
  },
};
