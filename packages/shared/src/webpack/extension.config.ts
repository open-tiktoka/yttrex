import { getConfig, GetConfigParams, WebpackConfig } from './config';
import { CopyWebpackPlugin, FileManagerPlugin } from './plugins';
import * as path from 'path';
import * as t from 'io-ts';

interface GetExtensionConfigParams<E extends t.Props>
  extends Omit<GetConfigParams<E>, 'target' | 'hot' | 'outputDir' | 'entry'> {
  target?: WebpackConfig['target'];
  entry?: Record<string, string>;
  outputDir?: string;
  manifestVersion: string;
  transformManifest: (m: any) => any;
}

const getExtensionConfig = <E extends t.Props>(
  extensionName: string,
  c: GetExtensionConfigParams<E>
): WebpackConfig => {
  process.env.VERSION = c.manifestVersion;

  const { buildENV, ...config } = getConfig({
    target: 'web',
    outputDir: path.resolve(c.cwd, 'build/extension'),
    entry: {
      ext: path.resolve(c.cwd, 'src/app.tsx'),
      popup: path.resolve(c.cwd, 'src/popup.tsx'),
      background: path.resolve(c.cwd, 'src/background/index.ts'),
    },
    ...c,
    hot: false,
  });

  config.devtool = config.mode === 'development' ? 'inline-source-map' : false;

  config.plugins.push(
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(c.cwd, 'public'),
          filter: (file: string) => {
            const { base } = path.parse(file);
            return !['manifest.json', 'index.html'].includes(base);
          },
        },
        {
          from: path.resolve(c.cwd, 'public/manifest.json'),
          transform: (content: Buffer) => {
            const manifest = JSON.parse(content.toString());
            manifest.version = c.manifestVersion;
            return JSON.stringify(c.transformManifest(manifest), null, 2);
          },
        },
      ],
    })
  );

  if (config.mode === 'production') {
    config.plugins.push(
      new FileManagerPlugin({
        events: {
          onEnd: {
            archive: [
              {
                source: path.resolve(c.cwd, './build/extension'),
                destination: path.resolve(
                  c.cwd,
                  `./build/extension/${extensionName}-extension-${c.manifestVersion}.zip`
                ),
              },
            ],
          },
        },
      })
    );
  }

  return { buildENV, ...config };
};

export { getExtensionConfig };
