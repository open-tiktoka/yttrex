import { ContentCreator } from '@backend/models/ContentCreator';
import {
  Box,
  Button,
  FormControl,
  FormGroup,
  Grid,
  IconButton,
  Input,
  InputAdornment,
  InputLabel,
  makeStyles,
  Typography,
} from '@material-ui/core';
import CloudDownload from '@material-ui/icons/CloudDownload';
import VisibilityIcon from '@material-ui/icons/Visibility';
import VisibilityOffIcon from '@material-ui/icons/VisibilityOff';
import * as E from 'fp-ts/lib/Either';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { assignAccessToken } from '../../../state/creator.commands';
import { deleteProfile, downloadTXTFile } from '../../../state/public.commands';

interface AccessTokenBoxProps {
  profile: ContentCreator | null;
}

const useStyles = makeStyles(() => ({
  root: {
    marginBottom: 100,
  },
  formControl: {
    marginBottom: 16,
  },
}));

export const AccessTokenBox: React.FC<AccessTokenBoxProps> = ({ profile }) => {
  const { t } = useTranslation();

  const [token, setToken] = React.useState(profile?.accessToken ?? '');
  const [authTokenVisible, setAuthTokenVisible] = React.useState(token === '');

  const classes = useStyles();

  const tokenValue =
    token === '' ? '' : authTokenVisible ? token : 'ACTK********';

  return (
    <Box className={classes.root} style={{ width: '100%' }}>
      <Typography variant="h4">{t('settings:access_token_title')}</Typography>
      <FormGroup row={true}>
        <Grid
          container
          className={classes.formControl}
          spacing={2}
          justifyContent="flex-end"
          alignItems="flex-end"
        >
          <Grid item md={10}>
            <FormControl fullWidth={true}>
              <InputLabel htmlFor="access-token">
                {t('settings:access_token')}
              </InputLabel>
              <Input
                fullWidth={true}
                value={tokenValue}
                readOnly={!authTokenVisible}
                onChange={(e) => {
                  setToken(e.target.value);
                }}
                endAdornment={
                  profile?.accessToken !== undefined ? (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={async () => {
                          setAuthTokenVisible(!authTokenVisible);
                          // setTimeout(() => {
                          //   setAuthTokenVisible(authTokenVisible);
                          // }, 2000);
                        }}
                        edge="end"
                      >
                        {authTokenVisible ? (
                          <VisibilityOffIcon />
                        ) : (
                          <VisibilityIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }
              />
            </FormControl>
          </Grid>
          <Grid item md={2} style={{ textAlign: 'right' }}>
            {profile?.accessToken !== undefined ? (
              <Button
                color="secondary"
                variant="outlined"
                size="small"
                startIcon={<CloudDownload />}
                onClick={() => {
                  void downloadTXTFile({
                    name: 'access-token.txt',
                    data: profile.accessToken,
                  })();
                }}
              >
                {t('actions:download')}
              </Button>
            ) : null}
          </Grid>
        </Grid>
        <Grid container>
          <Grid item md={6}>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={() => {
                void assignAccessToken({ token })().then((c) => {
                  if (E.isRight(c)) {
                    if (c.right !== null) {
                      setAuthTokenVisible(false);
                    }
                  }
                });
              }}
            >
              {t('actions:edit_access_token')}
            </Button>
          </Grid>
          <Grid item md={6} style={{ textAlign: 'right' }}>
            {profile?.accessToken !== undefined ? (
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={() => {
                  void deleteProfile({})().then(() => {
                    setToken('');
                    setAuthTokenVisible(true);
                  });
                }}
              >
                {t('actions:unlink_profile')}
              </Button>
            ) : null}
          </Grid>
        </Grid>
      </FormGroup>
    </Box>
  );
};