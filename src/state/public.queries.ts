import * as Endpoints from '@backend/endpoints';
import { Recommendation } from '@backend/models/Recommendation';
import { available, queryShallow, queryStrict, refetch } from 'avenger';
import { getDefaultSettings } from '../models/Settings';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TE from 'fp-ts/lib/TaskEither';
import { Messages } from '../models/Messages';
import { sendAPIMessage, sendMessage } from '../providers/browser.provider';

export const settings = queryShallow(() => {
  return pipe(
    sendMessage(Messages.GetSettings)(),
    TE.chain((s) => {
      if (s === null) {
        return sendMessage(Messages.UpdateSettings)(getDefaultSettings());
      }
      return TE.right(s);
    })
  );
}, available);

export const keypair = queryStrict(() => {
  return sendMessage(Messages.GetKeypair)();
}, refetch);

// public

export const videoRecommendations = queryShallow(
  ({
    videoId,
  }: {
    videoId: string;
  }): TE.TaskEither<chrome.runtime.LastError, Recommendation[]> =>
    sendAPIMessage(Endpoints.v3.Public.VideoRecommendations)({
      Params: { videoId },
    }),
  available
);