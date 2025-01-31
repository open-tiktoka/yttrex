import * as t from 'io-ts';
import { date } from 'io-ts-types/lib/date';
import { HomeType, SearchType, VideoType } from './Ad';

export const ParsedInfo = t.intersection(
  [
    t.strict(
      {
        index: t.number,
        label: t.string,
        elems: t.number,
        verified: t.boolean,
        foryou: t.union([t.string, t.null]),
        videoId: t.string,
        isLive: t.boolean,
        params: t.record(t.string, t.string),
        recommendedSource: t.string,
        recommendedTitle: t.string,
        timePrecision: t.string,
        thumbnailHref: t.string,
      },
      'Common'
    ),
    t.partial(
      {
        recommendedLength: t.number,
        recommendedDisplayL: t.string,
      },
      'Partial'
    ),
  ],
  'ParsedInfo'
);

export type ParsedInfo = t.TypeOf<typeof ParsedInfo>;

const VideoMetadata = t.strict(
  {
    type: VideoType,
    videoId: t.string,
    authorName: t.string,
    authorSource: t.string,
    title: t.string,
    publicationString: t.number,
    publicationTime: date,
    likeInfo: t.strict(
      {
        likes: t.string,
        dislikes: t.union([t.string, t.null]),
      },
      'LikeInfo'
    ),
    viewInfo: t.strict(
      {
        viewStr: t.string,
        viewNumber: t.number,
      },
      'ViewInfo'
    ),
    related: t.array(ParsedInfo),
  },
  'VideoMetadata'
);

const HomeMetadata = t.strict(
  {
    type: HomeType,
    query: t.string,
    selected: t.array(ParsedInfo),
    results: t.array(
      t.strict({
        position: t.number,
        title: t.string,
      })
    ),
  },
  'HomeMetadata'
);

const SearchMetadata = t.strict(
  {
    type: SearchType,
  },
  'SearchMetadata'
);

export const Metadata = t.intersection(
  [
    t.strict({
      id: t.string,
      publicKey: t.string,
      savingTime: date,
      clientTime: date,
      href: t.string,
      params: t.record(t.string, t.string),
      blang: t.string,
      login: t.boolean,
      metadataId: t.string,
    }),
    t.union([VideoMetadata, HomeMetadata, SearchMetadata]),
  ],
  'MetadataDB'
);

export type Metadata = t.TypeOf<typeof Metadata>;
