/* eslint-disable no-console */

import * as TE from 'fp-ts/lib/TaskEither';

import puppeteer from 'puppeteer';

import loadProfileState from './profileState';

import { isLoggedIn } from './tikTokUtil';

import { prompt, toError } from './util';

export interface SearchOnTikTokOptions {
  chromePath: string;
  file: string;
  url: string;
  profile: string;
}

export const searchOnTikTok = ({
  chromePath,
  file,
  profile,
  url,
}: SearchOnTikTokOptions): TE.TaskEither<Error, puppeteer.Page> =>
  TE.tryCatch(async() => {
    console.log(
      `launching chrome from "${chromePath}" with profile "${profile}"`,
    );

    const options = {
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

    const profileState = await loadProfileState(profile);

    if (!profileState.isTTExtensionInstalled()) {
      await prompt('please install tiktok extension and press return');
      await profileState.setTTExtensionInstalled(true);
    }

    let loggedIn = await isLoggedIn(page);

    while (!loggedIn) {
      console.log('please log in to TikTok');
      loggedIn = await isLoggedIn(page);
    }

    return page;
  }, toError);

export default searchOnTikTok;
