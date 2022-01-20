import { readdir, readFile } from 'fs/promises';

import os from 'os';

import { join } from 'path';

import readline from 'readline';

import * as TE from 'fp-ts/lib/TaskEither';

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

export const listDirectories = async(root: string): Promise<string[]> => {
  try {
    const entries = await readdir(root, {
      withFileTypes: true,
    });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => join(root, e.name));
  } catch (e) {
    return [];
  }
};

export const isProfileDir =
  (profileName: string) =>
    async(path: string): Promise<boolean> => {
      const preferencesFile = join(path, 'Preferences');
      try {
        const preferences = JSON.parse(await readFile(preferencesFile, 'utf8'));

        return preferences?.profile?.name === profileName;
      } catch (e) {
        return false;
      }
    };

/**
 * Finds a chrome user profile directory given a profile name.
 *
 * Not used after all, but kept for reference: it's not practical to
 * use an existing profile because you cannot have chrome running normally
 * and instrumented from the same user data dir...
 *
 * To use this with puppeteer, you need to set the userDataDir option
 * to dirname(output of this function), and also pass the option
 * --profile-directory=basename(output of this function).
 */
export const findChromeUserProfileDirByName = (name: string): TEString => {
  const profileContainerDirCandidates: string[] = [];

  if (os.platform() === 'win32') {
    if (process.env.LOCALAPPDATA) {
      profileContainerDirCandidates.push(
        join(process.env.LOCALAPPDATA, 'Google/Chrome/User Data'),
      );
    }
  } else if (os.platform() === 'darwin') {
    profileContainerDirCandidates.push(
      join(os.homedir(), 'Library/Application Support/Google/Chrome'),
      join(os.homedir(), 'Library/Application Support/Chromium'),
    );
  } else {
    profileContainerDirCandidates.push(
      join(os.homedir(), '.config/google-chrome'),
      join(os.homedir(), '.config/chromium'),
    );
  }

  return TE.tryCatch(async() => {
    const maybeProfileDirs = ([] as string[]).concat(
      ...(await Promise.all(profileContainerDirCandidates.map(listDirectories))),
    );

    const checkedCandidateDirs = await Promise.all(
      maybeProfileDirs.map(async(dir) => ({
        dir,
        isProfile: await isProfileDir(name)(dir),
      })),
    );

    const profileDirs = checkedCandidateDirs.filter(
      ({ isProfile }) => isProfile,
    );

    if (profileDirs.length === 0) {
      throw new Error(`no profile dir matching name "${name}" found`);
    }

    if (profileDirs.length > 1) {
      throw new Error(`multiple profile dirs matching name "${name}" found`);
    }

    return profileDirs[0].dir;
  }, toError);
};
