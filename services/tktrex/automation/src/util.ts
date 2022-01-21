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
