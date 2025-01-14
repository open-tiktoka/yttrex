import {
  Box,
  Button,
  FormControlLabel,
  Input,
  Typography,
} from '@material-ui/core';
import { ipcRenderer } from 'electron';
import * as React from 'react';
import { CREATE_EXPERIMENT_EVENT } from '../models/events';
import { GuardoniConfig } from '../../guardoni/types';
import { ExperimentLink } from '@shared/models/Experiment';

interface FromCSVFileTabProps {
  config: GuardoniConfig;
  onSubmit: (expId: string) => void;
}

interface URLState {
  newURL: string | undefined;
  newTitle: string | undefined;
  newURLTag: string | undefined;
  newWatchFor: string | number | null;
  urls: ExperimentLink[];
}

export const FromURLsTab: React.FC<FromCSVFileTabProps> = ({
  config,
  onSubmit,
}) => {
  const [{ newURL, newTitle, newURLTag, newWatchFor, urls }, setURLs] =
    React.useState<URLState>({
      newURL: undefined,
      newTitle: undefined,
      newURLTag: undefined,
      newWatchFor: null,
      urls: [],
    });

  const handleURLProcess = React.useCallback(() => {
    ipcRenderer.send(
      CREATE_EXPERIMENT_EVENT.value,
      config,
      urls.map((u) => ({ ...u, videoURL: u.url }))
    );
  }, [config, urls]);

  React.useEffect(() => {
    ipcRenderer.on(CREATE_EXPERIMENT_EVENT.value, (event, ...args) => {
      onSubmit(args[0]);
    });
  }, []);

  return (
    <Box width={'100%'}>
      <Box>
        <FormControlLabel
          label="URL"
          labelPlacement="top"
          control={
            <Input
              value={newURL ?? ''}
              onChange={(e) => {
                setURLs({
                  urls,
                  newTitle,
                  newURLTag,
                  newWatchFor,
                  newURL: e.target.value,
                });
              }}
            />
          }
        />

        <FormControlLabel
          label="Title"
          labelPlacement="top"
          control={
            <Input
              value={newTitle ?? ''}
              onChange={(e) => {
                setURLs({
                  urls,
                  newURL,
                  newURLTag,
                  newWatchFor,
                  newTitle: e.target.value,
                });
              }}
            />
          }
        />

        <FormControlLabel
          label="URL Tag"
          labelPlacement="top"
          control={
            <Input
              value={newURLTag ?? ''}
              onChange={(e) => {
                setURLs({
                  urls,
                  newURL,
                  newTitle,
                  newWatchFor,
                  newURLTag: e.target.value,
                });
              }}
            />
          }
        />
        <FormControlLabel
          label="Watch For"
          labelPlacement="top"
          control={
            <Input
              value={newWatchFor ?? ''}
              onChange={(e) => {
                setURLs({
                  urls,
                  newURL,
                  newTitle,
                  newURLTag,
                  newWatchFor: e.target.value,
                });
              }}
            />
          }
        />
        <Button
          disabled={(newURL?.length ?? 0) < 7 && (newTitle?.length ?? 0) < 5}
          onClick={() => {
            if (newURL && newTitle && newURLTag) {
              setURLs({
                newURL: undefined,
                newTitle: undefined,
                newURLTag: undefined,
                newWatchFor: null,
                urls: urls.concat({
                  url: newURL,
                  title: newTitle,
                  urltag: newURLTag,
                  watchFor: newWatchFor,
                }),
              });
            }
          }}
        >
          Add URL
        </Button>
      </Box>
      {urls.map((u) => (
        <Box key={u.title}>
          <Typography>{u.title}</Typography>
          <Typography>{u.url}</Typography>
        </Box>
      ))}

      <Button
        disabled={urls.length < 1}
        color="primary"
        variant="contained"
        style={{ marginBottom: 20, marginTop: 20 }}
        onClick={() => handleURLProcess()}
      >
        Start guardoni
      </Button>
    </Box>
  );
};
