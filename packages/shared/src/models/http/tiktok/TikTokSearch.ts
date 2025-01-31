import * as t from 'io-ts';

export const TikTokSearchMetadata = t.strict(
  {
    id: t.string,
    order: t.number,
    video: t.type({
      videoId: t.string,
      type: t.string,
      authorId: t.string,
    }),
    textdesc: t.string,
    query: t.string,
    thumbnail: t.string,
    savingTime: t.string,
    publishingDate: t.union([t.string, t.null]),
  },
  'TikTokSearchResult'
);

export type TikTokSearchMetadata = t.TypeOf<typeof TikTokSearchMetadata>;

export const TikTokSearch = t.array(TikTokSearchMetadata, 'TikTokSearch');

export type TikTokSearch = t.TypeOf<typeof TikTokSearch>;
