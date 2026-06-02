const path         = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = (options) => ({
  ...options,
  externals: [
    nodeExternals({
      allowlist: [
        '@movia/route-engine',
        '@movia/geo-engine',
        '@movia/shared-types',
        '@movia/shared-data',
      ],
    }),
  ],
  module: {
    rules: [
      {
        test:    /\.tsx?$/,
        use: {
          loader:  'ts-loader',
          options: { transpileOnly: true },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@movia/route-engine': path.resolve(__dirname, '../../packages/route-engine/src/index.ts'),
      '@movia/geo-engine':   path.resolve(__dirname, '../../packages/geo-engine/src/index.ts'),
      '@movia/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@movia/shared-data':  path.resolve(__dirname, '../../packages/shared-data/src/index.ts'),
    },
  },
});