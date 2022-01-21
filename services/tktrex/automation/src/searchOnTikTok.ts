/* eslint-disable no-console */

import * as TE from 'fp-ts/lib/TaskEither';

import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

import loadProfileState from './profileState';

import { isLoggedIn } from './tikTokUtil';

import { prompt, toError } from './util';

puppeteer.use(stealth());

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
}: SearchOnTikTokOptions): TE.TaskEither<Error, Page> =>
  TE.tryCatch(async() => {
    const profileState = await loadProfileState(profile);

    console.log(
      `launching chrome from "${
        chromePath
      }" with profile "${
        profile
      }", which has been used ${
        profileState.getNTimesUsed() - 1
      } times before`,
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
