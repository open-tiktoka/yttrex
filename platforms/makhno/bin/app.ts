/* eslint-disable @typescript-eslint/no-misused-promises */
import { makeBackend } from '@shared/backend';
import { RouteContext } from '@shared/backend/types';
import { GetLogger } from '@shared/logger';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import * as _ from 'lodash';
import { MongoClient } from 'mongodb';
import { apiList } from '../routes/apiList';
import mongo3 from '../../yttrex/backend/lib/mongo3';

const logger = GetLogger('api');
const logAPICount = { requests: {}, responses: {}, errors: {} };

function loginc(kind: string, fname: string): void {
  logAPICount[kind][fname] = logAPICount[kind][fname]
    ? logAPICount[kind][fname]++
    : 1;
}

const iowrapper =
  (fname: string) =>
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      loginc('requests', fname);
      const funct = apiList[fname];
      const httpresult = await funct(req, res);

      if (httpresult.headers)
        _.each(httpresult.headers, function (value, key) {
          logger.debug('Setting header %s: %s', key, value);
          res.setHeader(key, value);
        });

      if (!httpresult) {
        logger.debug("API (%s) didn't return anything!?", fname);
        loginc('errors', fname);
        res.send('Fatal error: Invalid output');
        res.status(501);
      } else if (httpresult.json?.error) {
        const statusCode = httpresult.json.status ?? 500;
        logger.debug('API (%s) failure, returning %d', fname, statusCode);
        loginc('errors', fname);
        res.status(statusCode);
        res.json(httpresult.json);
      } else if (httpresult.json) {
        // logger("API (%s) success, returning %d bytes JSON", fname, _.size(JSON.stringify(httpresult.json)));
        loginc('responses', fname);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.json(httpresult.json);
      } else if (httpresult.text) {
        // logger("API (%s) success, returning text (size %d)", fname, _.size(httpresult.text));
        loginc('responses', fname);
        res.send(httpresult.text);
      } else if (httpresult.status) {
        // logger("Returning empty status %d from API (%s)", httpresult.status, fname);
        loginc('responses', fname);
        res.status(httpresult.status);
      } else {
        logger.debug(
          'Undetermined failure in API (%s) →  %j',
          fname,
          httpresult
        );
        loginc('errors', fname);
        res.status(502);
        res.send('Error?');
      }
    } catch (error) {
      res.status(502);
      res.send('Software error: ' + error.message);
      loginc('errors', fname);
      logger.debug('Error in HTTP handler API(%s): %o', fname, error);
    }
    res.end();
  };

interface MakeAppContext {
  config: {
    port: number;
  };
  mongo: MongoClient;
}

/* one log entry per minute about the amount of API absolved */
setInterval(() => {
  let print = false;
  _.each(_.keys(logAPICount), function (k) {
    if (!_.keys(logAPICount[k]).length)
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete logAPICount[k];
    else print = true;
  });
  if (print) logger.debug('%j', logAPICount);
  logAPICount.responses = {};
  logAPICount.errors = {};
  logAPICount.requests = {};
}, 60 * 1000);

export const makeApp = async (
  ctx: MakeAppContext
): Promise<express.Application> => {
  const app = express();

  app.use(cors());
  app.options('/api/', cors());
  app.use(bodyParser.json({ limit: '6mb' }));
  app.use(bodyParser.urlencoded({ limit: '6mb', extended: true }));

  // get a router instance from express
  const router = express.Router();

  const routeCtx: RouteContext = {
    logger,
    db: {
      ...mongo3,
      mongo: ctx.mongo,
    },
  };
  const apiRouter = makeBackend(routeCtx, express.Router());

  router.use('/api/', apiRouter);
  apiRouter.post('/v1/submit', iowrapper('submitURL'));

  router.get('*', async (req, res) => {
    logger.debug('URL not handled: %s', req.url);
    res.status(404);
    res.send('URL not found');
  });

  app.use(router);

  app.set('port', ctx.config.port);

  return app;
};
