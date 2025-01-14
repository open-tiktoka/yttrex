import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import D from 'debug';
import dotenv from 'dotenv';
import { pipe } from 'fp-ts/lib/function';
import * as R from 'fp-ts/lib/Record';
import * as S from 'fp-ts/lib/string';
import * as t from 'io-ts';
import { BooleanFromString } from 'io-ts-types/lib/BooleanFromString';
import { PathReporter } from 'io-ts/lib/PathReporter';
import path from 'path';
import ReactRefreshTypescript from 'react-refresh-typescript';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { trexLogger } from '../logger';

const webpackLogger = trexLogger.extend('webpack');

// TODO: browserlist, auto-prefixing, ...?

const NODE_ENV = t.union(
  [t.literal('development'), t.literal('test'), t.literal('production')],
  'NODE_ENV'
);

const BUILD_ENV = t.strict(
  {
    NODE_ENV,
    BUNDLE_TARGET: t.union([t.literal('firefox'), t.literal('chrome')]),
    BUNDLE_STATS: BooleanFromString,
    DEBUG: t.union([t.undefined, t.string]),
  },
  'processENV'
);

type BUILD_ENV = t.TypeOf<typeof BUILD_ENV>;
export interface WebpackConfig extends webpack.Configuration {
  buildENV: BUILD_ENV;
  plugins: any[]; // webpack.WebpackPluginInstance[]
}

export interface GetConfigParams<E extends t.Props> {
  cwd: string;
  outputDir: string;
  env: t.ExactC<t.TypeC<E>>;
  entry: {
    [key: string]: string;
  };
  hot: boolean;
  target: WebpackConfig['target'];
}

const getConfig = <E extends t.Props>(
  opts: GetConfigParams<E>
): WebpackConfig => {
  const DOTENV_CONFIG_PATH =
    process.env.DOTENV_CONFIG_PATH ??
    path.resolve(
      opts.cwd,
      process.env.NODE_ENV === 'production' ? '.env' : '.env.development'
    );

  // eslint-disable-next-line
  console.log(
    `Reading process.env from %s for %s (%s)`,
    DOTENV_CONFIG_PATH,
    path.basename(opts.cwd),
    Object.keys(opts.entry).join(', ')
  );

  dotenv.config({ path: DOTENV_CONFIG_PATH });

  D.enable(process.env.DEBUG ?? '');

  const mode =
    process.env.NODE_ENV === 'production' ? 'production' : 'development';

  const buildENV = pipe(
    {
      BUNDLE_TARGET: 'chrome',
      BUNDLE_STATS: 'false',
      NODE_ENV: mode,
      ...process.env,
    },
    BUILD_ENV.decode,
    (validation) => {
      if (validation._tag === 'Left') {
        // eslint-disable-next-line
        console.error(PathReporter.report(validation).join('\n'));
        // eslint-disable-next-line
        console.log('\n');
        throw new Error('process.env decoding failed.');
      }
      return validation.right;
    }
  );

  webpackLogger.debug('Build ENV %O', buildENV);

  const appEnv = pipe(
    {
      ...process.env,
      NODE_ENV: mode,
      BUILD_DATE: new Date().toISOString(),
    },
    opts.env.decode,
    (validation) => {
      if (validation._tag === 'Left') {
        webpackLogger.error(
          `Validation error for build end: %O`,
          PathReporter.report(validation).join('\n')
        );
        throw new Error(`${opts.env.name} decoding failed.`);
      }
      return validation.right;
    }
  );

  webpackLogger.debug('App ENV %O', appEnv);

  const stringifiedAppEnv = pipe(
    appEnv as any,
    R.reduceWithIndex(S.Ord)(
      {
        'process.env.NODE_ENV': JSON.stringify(mode),
      },
      (key, acc, v) => {
        // this is cause DefinePlugin to complain when we override
        // process.env vars
        // (process.env as any)[key] = v;
        return {
          ...acc,
          [`process.env.${key}`]: JSON.stringify(v),
        };
      }
    )
  );

  // eslint-disable-next-line
  webpackLogger.debug(`Process env %O`, stringifiedAppEnv);

  const plugins: any[] = [];

  if (opts.target === 'web' || opts.target === 'electron-renderer') {
    plugins.push(new webpack.DefinePlugin(stringifiedAppEnv as any));
  }

  if (opts.hot && opts.target === 'web' && mode === 'development') {
    plugins.push(new webpack.HotModuleReplacementPlugin());
    plugins.push(new ReactRefreshWebpackPlugin());
  }

  if (buildENV.BUNDLE_STATS) {
    plugins.push(
      new BundleAnalyzerPlugin({
        generateStatsFile: true,
        analyzerMode: 'json',
      })
    );
  }

  return {
    mode,

    context: opts.cwd,

    entry: opts.entry,
    target: opts.target,

    output: {
      path: opts.outputDir,
      filename: '[name].js',
    },
    module: {
      rules: [
        {
          test: /\.(t|j)sx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                context: opts.cwd,
                projectReferences: true,
                transpileOnly: true,
                getCustomTransformers: () => ({
                  before: [
                    mode === 'development' &&
                      opts.hot &&
                      ReactRefreshTypescript(),
                  ].filter(Boolean),
                }),
              },
            },
          ],
        },
        {
          test: /\.(ttf|svg)$/,
          type: 'asset/inline',
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: 'style-loader',
            },
            {
              loader: 'css-loader',
            },
          ],
        },
      ],
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      plugins: [
        new TsconfigPathsPlugin({
          // configFile: tsConfigFile,
          // context: opts.cwd,
        }),
      ],
      modules: ['node_modules', path.resolve(opts.cwd)],
    },

    devtool: mode === 'development' ? 'inline-source-map' : 'source-map',

    plugins,
    // custom options
    buildENV,
  };
};

export { getConfig };
