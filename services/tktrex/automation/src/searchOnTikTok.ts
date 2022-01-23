/* eslint-disable no-console */

import * as TE from 'fp-ts/lib/TaskEither';

import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

import loadProfileState from './profileState';

import { ensureLoggedIn } from './tikTokUtil';

import { prompt, setupBrowser, sleep, toError } from './util';

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

    const page = await setupBrowser({
      chromePath,
      extensionSource,
      profile,
    });

    await page.goto(url);

    await ensureLoggedIn(page);

    if (extensionSource === 'user-provided') {
      await prompt(
        'please install the TikTok extension and press enter once done, or re-run this script',
      );
      // the other branch of that previous if is handled by the code in createStartPage
    }

    await await sleep(60000);

    return page;
  }, toError);

export default searchOnTikTok;
