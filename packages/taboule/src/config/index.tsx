import { Box, Typography } from '@material-ui/core';
import { DataGridProps, GridColTypeDef } from '@material-ui/data-grid';
import { ChannelRelated } from '@shared/models/ChannelRelated';
import {
  HomeMetadata,
  SearchMetadata,
  VideoMetadata,
} from '@shared/models/contributor/ContributorPersonalStats';
import {
  SummaryHTMLMetadata,
  SummaryMetadata,
} from '@shared/models/contributor/ContributorPersonalSummary';
import { TikTokSearchMetadata } from '@shared/models/http/tiktok/TikTokSearch';
import { GuardoniExperiment, Metadata } from '@shared/models/Metadata';
import * as React from 'react';
import CSVDownloadButton from '../components/buttons/CSVDownloadButton';
import DeleteButton from '../components/buttons/DeleteButton';
import * as cells from '../components/gridCells';
import { TabouleCommands } from '../state/commands';
import * as actions from './actions';
import * as inputs from './inputs';
import * as params from './params';

interface TabouleColumnProps<K> extends Omit<GridColTypeDef, 'field'> {
  field: K | 'actions';
}

interface TabouleQueryConfiguration<P extends Record<string, any>>
  extends Omit<DataGridProps, 'columns' | 'rows'> {
  columns: Array<TabouleColumnProps<keyof P>>;
  inputs?: (params: any, setParams: React.Dispatch<any>) => JSX.Element;
  actions?: () => JSX.Element;
}

interface TabouleConfiguration {
  ccRelatedUsers: TabouleQueryConfiguration<ChannelRelated>;
  getExperimentById: TabouleQueryConfiguration<Metadata>;
  getExperimentList: TabouleQueryConfiguration<GuardoniExperiment>;
  personalAds: TabouleQueryConfiguration<{}>;
  personalHomes: TabouleQueryConfiguration<HomeMetadata>;
  personalSearches: TabouleQueryConfiguration<SearchMetadata>;
  personalVideos: TabouleQueryConfiguration<VideoMetadata>;
  tikTokPersonalHTMLSummary: TabouleQueryConfiguration<SummaryHTMLMetadata>;
  tikTokPersonalMetadataSummary: TabouleQueryConfiguration<SummaryMetadata>;
  tikTokSearches: TabouleQueryConfiguration<TikTokSearchMetadata>;
}

const columnDefault: Partial<GridColTypeDef> = {
  minWidth: 200,
};

export const defaultConfiguration = (
  commands: TabouleCommands,
  params: any
): TabouleConfiguration => {
  return {
    ccRelatedUsers: {
      inputs: inputs.channelIdInput,
      columns: [
        {
          ...columnDefault,
          field: 'recommendedSource',
          headerName: 'Recommended Source',
          minWidth: 160,
        },
        {
          ...columnDefault,
          field: 'percentage',
          minWidth: 160,
        },
        {
          ...columnDefault,
          field: 'recommendedChannelCount',
          minWidth: 160,
        },
      ],
    },
    getExperimentById: {
      inputs: inputs.experimentIdInput,
      columns: [
        {
          ...columnDefault,
          field: 'savingTime',
          headerName: 'savingTime',
          minWidth: 400,
          renderCell: cells.distanceFromNowCell,
        },
      ],
    },
    getExperimentList: {
      columns: [
        {
          ...columnDefault,
          field: 'experimentId',
          headerName: 'experimentId',
          minWidth: 400,
        },
        {
          ...columnDefault,
          field: 'when',
          headerName: 'Registered',
          renderCell: cells.distanceFromNowCell,
        },
        {
          ...columnDefault,
          field: 'links',
          minWidth: 350,
          renderCell: (params) => {
            return (
              <Box key={params.id}>
                {((params?.value as any[]) || []).map((linkinfo) => {
                  return <a href={linkinfo.url}>{linkinfo.urltag}</a>;
                })}
              </Box>
            );
          },
        },
      ],
    },
    personalSearches: {
      inputs: inputs.publicKeyInput,
      actions: () => {
        return (
          <Box textAlign={'right'}>
            <CSVDownloadButton
              onClick={() => {
                void commands.downloadAsCSV({
                  Params: {
                    publicKey: params.publicKey,
                    type: 'search',
                  },
                })();
              }}
            />
          </Box>
        );
      },
      columns: [
        {
          ...columnDefault,
          field: 'id',
          minWidth: 100,
        },
        {
          ...columnDefault,
          field: 'savingTime',
          renderCell: cells.distanceFromNowCell,
        },
        {
          ...columnDefault,
          field: 'query',
          minWidth: 350,
          renderCell: (params) => {
            return (
              <Typography variant="h6">{params.formattedValue}</Typography>
            );
          },
        },
        {
          ...columnDefault,
          field: 'results',
          minWidth: 150,
        },
        {
          ...columnDefault,
          field: 'actions',
          renderCell: (cellParams) => {
            return (
              <Box>
                <DeleteButton
                  id={cellParams.row.id}
                  onClick={(id) => {
                    void commands.deleteContribution(
                      {
                        Params: {
                          publicKey: params.publicKey,
                          selector: 'undefined',
                        },
                      },
                      {}
                    )();
                  }}
                />
                <CSVDownloadButton
                  onClick={() => {
                    void commands.downloadSearchesAsCSV({
                      Params: {
                        queryString: cellParams.getValue(
                          cellParams.row.id,
                          'query'
                        ) as string,
                      },
                    })();
                  }}
                />
              </Box>
            );
          },
        },
      ],
    },
    personalVideos: {
      inputs: inputs.publicKeyInput,
      actions: () => {
        return (
          <Box textAlign={'right'}>
            <CSVDownloadButton
              onClick={() => {
                void commands.downloadAsCSV({
                  Params: {
                    publicKey: params.publicKey,
                    type: 'video',
                  },
                })();
              }}
            />
          </Box>
        );
      },
      columns: [
        {
          ...columnDefault,
          field: 'relative',
        },
        {
          ...columnDefault,
          field: 'authorName',
        },
        {
          ...columnDefault,
          field: 'authorSource',
        },
        {
          ...columnDefault,
          field: 'actions',
          renderCell: actions.personalMetadataActions(commands, params),
        },
      ],
    },
    personalAds: {
      inputs: inputs.publicKeyInput,
      columns: [],
    },
    personalHomes: {
      inputs: inputs.publicKeyInput,
      columns: [
        {
          ...columnDefault,
          field: 'id',
          minWidth: 100,
        },
        {
          ...columnDefault,
          field: 'savingTime',
          renderCell: cells.distanceFromNowCell,
        },
        {
          ...columnDefault,
          field: 'selected',
          renderCell: (params) => {
            if (Array.isArray(params.value)) {
              return params.value.length;
            }
            return 0;
          },
        },
        {
          ...columnDefault,
          field: 'actions',
          renderCell: actions.personalMetadataActions(commands, params),
        },
      ],
    },
    tikTokPersonalHTMLSummary: {
      inputs: inputs.publicKeyInput,
      columns: [
        {
          ...columnDefault,
          field: 'id',
        },
        {
          ...columnDefault,
          field: 'timelineId',
        },
        {
          ...columnDefault,
          field: 'href',
        },
        {
          ...columnDefault,
          field: 'savingTime',
          renderCell: cells.distanceFromNowCell,
        },
      ],
    },
    tikTokPersonalMetadataSummary: {
      inputs: inputs.publicKeyInput,
      columns: [
        {
          ...columnDefault,
          field: 'id',
        },
        {
          ...columnDefault,
          field: 'timelineId',
        },
        {
          ...columnDefault,
          field: 'author',
          renderCell: (props) => {
            return <Typography>{(props.value as any)?.name ?? ''}</Typography>;
          },
        },
        {
          ...columnDefault,
          field: 'relative',
        },
      ],
    },
    tikTokSearches: {
      inputs: inputs.publicKeyInput,
      actions: () => {
        return (
          <Box textAlign={'right'}>
            <CSVDownloadButton
              onClick={() => {
                void commands.downloadAsCSV({
                  Params: {
                    publicKey: params.publicKey,
                    type: 'search',
                  },
                })();
              }}
            />
          </Box>
        );
      },
      columns: [
        {
          ...columnDefault,
          field: 'id',
        },
        {
          ...columnDefault,
          field: 'query',
          renderCell: (params) => {
            return (
              <a
                href={`/search/#${encodeURI(params.formattedValue as string)}`}
              >
                {params.formattedValue}
              </a>
            );
          },
        },
        {
          ...columnDefault,
          field: 'thumbnail',
          renderCell: cells.avatarCell,
        },
        {
          ...columnDefault,
          field: 'savingTime',
          renderCell: cells.distanceFromNowCell,
        },
      ],
    },
  };
};

export { actions, inputs, params };