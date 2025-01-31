import { AppError } from '@shared/errors/AppError';
import { DirectiveType } from '@shared/models/Directive';
import * as A from 'fp-ts/lib/Array';
import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/lib/TaskEither';
import { NonEmptyString } from 'io-ts-types/lib/NonEmptyString';
import { guardoniLogger } from '../logger';
import { GetGuardoni } from './guardoni';
import { GuardoniConfig, GuardoniOutput, GuardoniSuccessOutput } from './types';
import type puppeteer from 'puppeteer-core';

export const cliLogger = guardoniLogger.extend('cli');

export type GuardoniCommandConfig =
  | {
      run: 'register-csv';
      file: NonEmptyString;
      type?: DirectiveType;
    }
  | {
      run: 'experiment';
      experiment: NonEmptyString;
    }
  | {
      run: 'auto';
      value: '1' | '2';
    }
  | {
      run: 'list';
    };

export interface GuardoniCLI {
  run: (
    command: GuardoniCommandConfig
  ) => TE.TaskEither<AppError, GuardoniOutput>;
  runOrThrow: (command: GuardoniCommandConfig) => Promise<void>;
}

export type GetGuardoniCLI = (
  config: GuardoniConfig,
  p: typeof puppeteer
) => GuardoniCLI;

const foldOutput = (
  command: GuardoniCommandConfig,
  out: GuardoniOutput
): string => {
  const rest =
    out.type === 'success'
      ? pipe(
          out.values,
          A.map((v) => {
            return Object.entries(v).map(([key, value]) => {
              if (typeof value === 'string') {
                return [`${key}: ${value}`];
              }

              const valuesChunk = Object.entries(value).map(
                ([key, value]) => `${key}: ${JSON.stringify(value)}`
              );

              return [`${key}: \n\t`, ...valuesChunk];
            });
          }),
          A.flatten
        )
      : out.details;

  return [
    '\n',
    `${command.run.slice(0, 1).toUpperCase()}${command.run.slice(1)} ${
      out.type === 'error' ? 'failed' : 'succeeded'
    }: ${out.message}`,
    '\n',
    rest.length > 0
      ? out.type === 'error'
        ? 'Error Details:\n'
        : 'Output values:\n'
      : null,
    ...rest,
  ].join('\n');
};

export const GetGuardoniCLI: GetGuardoniCLI = (config, p): GuardoniCLI => {
  cliLogger.debug('Initialized with config %O', config);

  const run = (
    command: GuardoniCommandConfig
  ): TE.TaskEither<AppError, GuardoniSuccessOutput> =>
    pipe(
      GetGuardoni({ config, logger: guardoniLogger, puppeteer: p }),
      TE.chain((g) => {
        return TE.fromIO<
          TE.TaskEither<AppError, GuardoniSuccessOutput>,
          AppError
        >(() => {
          cliLogger.debug('Running command %O', command);
          switch (command.run) {
            case 'list':
              return g.listExperiments();
            case 'register-csv':
              return g.registerExperimentFromCSV(
                command.file,
                command.type ?? 'comparison'
              );
            case 'experiment':
              return g.runExperiment(command.experiment);
            case 'auto':
            default:
              return g.runAuto(command.value);
          }
        });
      }),
      TE.flatten,
      TE.mapLeft((e) => {
        guardoniLogger.error(`Run error: %O`, e);
        return e;
      })
    );

  const runOrThrow = (command: GuardoniCommandConfig): Promise<void> =>
    pipe(
      run(command),
      TE.fold(
        (e) => () => {
          // eslint-disable-next-line
          console.log(
            foldOutput(command, {
              type: 'error',
              message: e.message,
              details: e.details,
            })
          );
          return Promise.reject(e);
        },
        (result) => () => {
          // eslint-disable-next-line
          console.log(foldOutput(command, result));
          return Promise.resolve();
        }
      )
    )();

  return {
    run,
    runOrThrow,
  };
};
