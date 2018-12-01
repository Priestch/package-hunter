const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    app: './src/index.js',
    background: './src/background.js',
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        from: './src/manifest.json',
      },
      {
        from: './src/assets',
      },
    ]),
  ],
};
