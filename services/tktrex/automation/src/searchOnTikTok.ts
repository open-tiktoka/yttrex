/* eslint-disable no-console */

import * as TE from 'fp-ts/lib/TaskEither';

import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

import loadProfileState from './profileState';

import { isLoggedIn } from './tikTokUtil';

import { createExtensionDirectory, prompt, sleep, toError } from './util';

puppeteer.use(stealth());

export interface SearchOnTikTokOptions {
  chromePath: string;
  extensionSource: string;
  file: string;
  url: string;
  profile: string;
}

export const searchOnTikTok = ({
  chromePath,
  extensionSource,
  file,
  profile,
  url,
}: SearchOnTikTokOptions): TE.TaskEither<Error, Page> =>
  TE.tryCatch(async() => {
    const profileState = await loadProfileState(profile);

    console.log(
      `launching chrome from "${chromePath}" with profile "${profile}", which has been used ${
        profileState.getNTimesUsed() - 1
      } times before`,
    );

    const extArgs =
      extensionSource === 'user-provided'
        ? []
        : await (async() => {
          const extPath = await createExtensionDirectory(extensionSource);
          console.log(`extension path: ${extPath}`);

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

    const page = await browser.newPage();
    await page.goto(url);

    let loggedIn = await isLoggedIn(page);

    if (extensionSource === 'user-provided') {
      await prompt(
        'please install the TikTok extension and press enter when done',
      );
    }

    while (!loggedIn) {
      console.log('please log in to TikTok');
      loggedIn = await isLoggedIn(page);
    }

    await sleep(60000);

    return page;
  }, toError);

export default searchOnTikTok;
