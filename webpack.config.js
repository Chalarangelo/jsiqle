const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'jedql',
      type: 'umd2',
    },
  },
  target: 'node',
  resolve: {
    alias: {
      src: [path.resolve(__dirname, 'src')],
    },
  },
  stats: 'minimal',
};
