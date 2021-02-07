const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, options) => {
  console.log('NODE_ENV: ', env.NODE_ENV); // 'local'
  console.log('Production: ', env.production); // true
  console.log('Development: ', env.development); // true

  return {
    entry: './src/index.ts',
    devtool: 'inline-source-map',
    plugins: [
      new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
      new HtmlWebpackPlugin({
        // title: 'Roll 20 clone',
        favicon: './src/favicon.ico',
        template: './src/index.html',
      }),
      new MiniCssExtractPlugin(),
      new webpack.EnvironmentPlugin({
        'BACKEND_URL': options.mode === 'production' ?
          'https://roll202.herokuapp.com' :
          'http://localhost:5000'
      })
    ],
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: [MiniCssExtractPlugin.loader, 'css-loader'],
        },
        {
          "test": /\.ts$/,
          "exclude": /node_modules/,
          "use": {
            "loader": "ts-loader",
            "options": {
              "projectReferences": true,
              logLevel: 'info'
            }
          }
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'dist')
    },
    // watchOptions: {
    //   ignored: /node_modules/,
    //   aggregateTimeout: 30,
    //   poll: 30
    // },
    // stats: 'verbose',
  }
};
