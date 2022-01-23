import Crypto from 'crypto';

import fs from 'fs';

import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import readline from 'readline';
import { URL } from 'url';

import * as TE from 'fp-ts/lib/TaskEither';

import fetch from 'node-fetch';
import puppeteer, { Page } from 'puppeteer';
import unzip from 'unzipper';

export type TEString = TE.TaskEither<Error, string>;

export const toError = (e: unknown): Error => {
  if (e instanceof Error) {
    return e;
  }
  return new Error('unspecified error');
};

export const prompt = async(message: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(message, (answer) => {
      rl.close();
      return resolve(answer);
    });
  });

export const sleep = async(ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const tmpDir = async(prefix?: string): Promise<string> => {
  const dir = tmpdir();
  const name = prefix
    ? `${prefix}-${Crypto.randomBytes(8).toString('hex')}`
    : '';
  const path = join(dir, name);
  await mkdir(path);
  return path;
};

const createExtensionDirectoryFromFile = async(
  file: string,
): Promise<string> => {
  const path = await tmpDir('extension');

  fs.createReadStream(file).pipe(unzip.Extract({ path }));

  return path;
};

const createExtensionDirectoryFromURL = async(url: URL): Promise<string> => {
  const path = await tmpDir('extension');
  const res = await fetch(url.href);

  if (!res.body) {
    throw new Error('no body in response from node-fetch');
  }

  res.body.pipe(unzip.Extract({ path }));

  return path;
};

export const createExtensionDirectory = (
  extensionSource: string,
): Promise<string> => {
  try {
    const url = new URL(extensionSource);
    return createExtensionDirectoryFromURL(url);
  } catch (e) {
    return createExtensionDirectoryFromFile(extensionSource);
  }
};

export const setupBrowser = async({
  chromePath,
  extensionSource,
  profile,
}: {
  chromePath: string;
  extensionSource: string;
  profile: string;
}): Promise<Page> => {
  const extArgs =
    extensionSource === 'user-provided'
      ? []
      : await (async() => {
        const extPath = await createExtensionDirectory(extensionSource);

        return [
          `--load-extension=${extPath}`,
          `--disable-extensions-except=${extPath}`,
        ];
      })();

  const options = {
    args: ['--no-sandbox', '--disabled-setuid-sandbox', ...extArgs],
    defaultViewport: {
      height: 1080,
      width: 1920,
    },
    executablePath: chromePath,
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    userDataDir: profile,
  };

  const browser = await puppeteer.launch(options);

  return await browser.newPage();
};
