import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TE from 'fp-ts/lib/TaskEither';
import { MinimalEndpointInstance, TypeOfEndpointInstance } from 'ts-endpoint';
import { getStaticPath } from 'utils/endpoint.utils';
import { APIRequest, ErrorOccurred, Messages } from '../models/Messages';
import { bo } from '../utils/browser.utils';
import { bkgLogger } from '../utils/logger.utils';

export const toBrowserError = (e: unknown): chrome.runtime.LastError => {
  // eslint-disable-next-line
  bkgLogger.error('An error occurred %O', e);
  if (e instanceof Error) {
    return { message: e.message };
  }

  if (e !== undefined) {
    if ((e as any).message !== undefined) {
      return { message: (e as any).message };
    }
  }
  return { message: 'Unknown error' };
};

export const catchRuntimeLastError = <A>(
  v: A
): TE.TaskEither<chrome.runtime.LastError, A> => {
  if (bo.runtime.lastError !== null && bo.runtime.lastError !== undefined) {
    // eslint-disable-next-line
    bkgLogger.error('Runtime error caught %O', bo.runtime.lastError);
    return TE.left(bo.runtime.lastError);
  }
  return TE.right(v);
};

export const sendMessage =
  <M extends Messages[keyof Messages]>(r: M) =>
  (
    p?: M['Request']['payload']
  ): TE.TaskEither<chrome.runtime.LastError, M['Response']['response']> =>
    pipe(
      TE.tryCatch(
        () =>
          new Promise<M['Response']>((resolve) => {
            bkgLogger.debug(
              'Sending message %s with payload %O',
              r.Request.type,
              p
            );
            bo.runtime.sendMessage<M['Request'], M['Response']>(
              { type: r.Request.type, payload: p as any },
              resolve
            );
          }),
        E.toError
      ),
      TE.chain(catchRuntimeLastError),
      TE.chain((result) => {
        if (result.type === ErrorOccurred.value) {
          return TE.left(toBrowserError(result.response));
        }
        return TE.right(result.response);
      })
    );

export const sendAPIMessage =
  <E extends MinimalEndpointInstance>(endpoint: E) =>
  (
    Input: TypeOfEndpointInstance<E>['Input']
  ): TE.TaskEither<
    chrome.runtime.LastError,
    TypeOfEndpointInstance<E>['Output']
  > => {
    return pipe(
      TE.tryCatch(
        () =>
          new Promise<TypeOfEndpointInstance<E>['Output']>((resolve) => {
            bkgLogger.debug(
              'Sending API message for endpoint %O',
              endpoint
            );
            bo.runtime.sendMessage<
              {
                type: typeof APIRequest.value;
                payload: {
                  staticPath: string;
                  Input: TypeOfEndpointInstance<E>['Input'];
                };
              },
              TypeOfEndpointInstance<E>['Output']
            >(
              {
                type: APIRequest.value,
                payload: {
                  staticPath: getStaticPath(endpoint),
                  Input,
                },
              },
              resolve
            );
          }),
        E.toError
      ),
      TE.chain(catchRuntimeLastError),
      TE.chain((result) => {
        if (result.type === ErrorOccurred.value) {
          return TE.left(toBrowserError(result.response));
        }
        return TE.right(result.response);
      })
    );
  };