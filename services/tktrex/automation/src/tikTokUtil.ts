import { Page } from 'puppeteer';

import { sleep } from './util';

export const isLoggedIn = async(page: Page): Promise<boolean> => {
  const timeout = 5000;
  try {
    const now = Date.now();

    // we're logged in on TikTok if the login button
    // is not visible, so check for that
    await page.waitForSelector('[data-e2e="top-login-button"]', {
      timeout,
    });

    // wait a bit for consistency in case the button
    // was immediately visible
    const elapsed = Date.now() - now;
    if (elapsed < timeout) {
      await sleep(timeout - elapsed);
    }

    return false;
  } catch (e) {
    // we reach this point if the login button is not visible,
    // hence we're logged in if and only if we're on the
    // TikTok website, which is the case if for instance
    // the TikTok logo is visible
    return page.$('[data-e2e="tiktok-logo"') !== null;
  }
};
