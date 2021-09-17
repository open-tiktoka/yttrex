const { configPaths } = require('react-app-rewire-alias');
const { aliasDangerous } = require('react-app-rewire-alias/lib/aliasDangerous');
const { pipe } = require('fp-ts/lib/pipeable');
const A = require('fp-ts/lib/Array');
const R = require('fp-ts/lib/Record');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const WebpackNotifierPlugin = require('webpack-notifier');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const { BrowserExtensionPlugin } = require('webpack-browser-extension-plugin');
const pkgJson = require('./package.json');

module.exports = {
  webpack: function (config) {
    const produceBundleStats = process.env.REACT_APP_BUNDLE_STATS === 'true';
    const isProduction = process.env.REACT_APP_NODE_ENV === 'production';

    // add ts paths as aliases
    const webPaths = pipe(
      configPaths('tsconfig.paths.json'),
      R.map((p) => path.resolve('./src', p))
    );

    const paths = {
      ...webPaths,
    };

    aliasDangerous(paths)(config);

    config.entry = {
      main: path.resolve(__dirname, 'src/index.tsx'),
      app: path.resolve(__dirname, 'src/app.js'),
      popup: path.resolve(__dirname, 'src/chrome/popup/index.tsx'),
      background: path.resolve(__dirname, 'src/chrome/background/index.js'),
    };

    // override default html-webpack-plugin for 'all' chunks
    config.plugins[0] = new HtmlWebpackPlugin({
      chunks: ['main'],
      template: path.resolve(__dirname, 'public/index.html'),
      inject: true,
      filename: 'index.html',
    });

    config.plugins = config.plugins.concat(
      new HtmlWebpackPlugin({
        chunks: ['popup'],
        template: path.resolve(__dirname, 'public/popup.html'),
        inject: true,
        filename: 'popup.html',
      }),
      new BrowserExtensionPlugin({
        // todo: it fails due to a webpack-inject-plugin-loader error
        autoReload: false,
        backgroundEntry: 'background',
        ignoreEntries: ['main', 'app', 'popup'],
        manifestFilePath: 'public/manifest.json',
        onCompileManifest: (manifest) => {
          const content_scripts = isProduction
            ? [
                {
                  ...manifest.content_scripts[0],
                  matches: pipe(
                    manifest.content_scripts[0].matches,
                    A.takeRight(2)
                  ),
                },
              ]
            : manifest.content_scripts;

          const buildManifest = {
            ...manifest,
            content_scripts,
            version: isProduction ? pkgJson.version : `${pkgJson.version}-dev`,
          };

          return buildManifest;
        },
      })
    );

    config.output.path = path.resolve(__dirname, 'build');
    config.output.filename = '[name].js';

    // produce bundle stats if needed
    if (produceBundleStats) {
      config.plugins = config.plugins.concat(
        new BundleAnalyzerPlugin({
          generateStatsFile: true,
          analyzerMode: 'json',
        })
      );
    }

    if (!isProduction) {
      config.plugins = config.plugins.concat(
        new webpack.LoaderOptionsPlugin({
          debug: true,
        }),
        new WebpackNotifierPlugin({
          // My notification daemon displays "critical" messages only.
          // Dunno if this is the case for every Ubuntu machine.
          urgency: 'critical',
          alwaysNotify: false,
          title: 'ycai',
          contentImage: path.join(__dirname, 'icons', 'ycai128.png'),
          timeout: 2,
          excludeWarnings: true,
        })
      );
    } else {
      config.plugins = config.plugins.concat(
        new FileManagerPlugin({
          events: {
            onEnd: {
              archive: isProduction
                ? [
                    {
                      source: './build',
                      destination: './build/extension.zip',
                    },
                  ]
                : [],
            },
          },
        })
      );
    }

    // Disable bundle splitting,
    // a single bundle file has to loaded as `content_script`.
    // config.optimization.splitChunks = {
    //   cacheGroups: {
    //     default: false,
    //   },
    // };

    // `false`: each entry chunk embeds runtime.
    // The extension is built with a single entry including all JS.
    // https://symfonycasts.com/screencast/webpack-encore/single-runtime-chunk
    config.optimization.runtimeChunk = false;

    // `MiniCssExtractPlugin` is used by the default CRA webpack configuration for
    // extracting CSS into separate files. The plugin has to be removed because it
    // uses `[contenthash]` in filenames of the separate CSS files.
    config.plugins = config.plugins
      .filter((plugin) => !(plugin instanceof MiniCssExtractPlugin))
      .concat(
        // `MiniCssExtractPlugin` is used with its default config instead,
        // which doesn't contain `[contenthash]`.
        new MiniCssExtractPlugin()
      );

    return config;
  },
};