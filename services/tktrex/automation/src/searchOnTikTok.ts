/* eslint-disable no-console */

import * as TE from 'fp-ts/lib/TaskEither';

import puppeteer from 'puppeteer';

import {
  sleep,
  toError,
} from './util';

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
      executablePath: chromePath,
      headless: false,
      ignoreDefaultArgs: ['--disable-extensions'],
      userDataDir: profile,
    };

    const browser = await puppeteer.launch(options);

    const page = await browser.newPage();
    await page.goto(url);

    await sleep(30000);
    return page;
  }, toError);

export default searchOnTikTok;
