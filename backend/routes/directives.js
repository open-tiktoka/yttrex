const _ = require('lodash');
const debug = require('debug')('routes:directives');
const moment = require('moment');

const automo = require('../lib/automo');
const utils = require('../lib/utils');
const mongo3 = require('../lib/mongo3');
const nconf = require('nconf');
const security = require('../lib/security');

async function list(req) {
  /* this function pull from the collection "directives"
     and filter by returning only the 'comparison' kind of
     experiment. This is going to change as only 'comparison' would exist. */

  const type = req.params.directiveType;

  if (['comparison', 'chiaroscuro'].indexOf(type) === -1)
    return { text: 'Directive Type not supported! ' };

  if (type === 'comparison') {
    /* this kind of directive require password for listing, instead the shadowban/chiaroscuro at the moment is free access */
    if (!security.checkPassword(req)) return { status: 403 };
  }

  /* default query params for Taboule,
       they might be moved in a proper lib function */
  const DEFAULT_AMOUNT = 50;
  const amount = req.query.amount
    ? _.parseInt(req.query.amount)
    : DEFAULT_AMOUNT;
  const skip = req.query.skip ? _.parseInt(req.query.skip) : 0;
  const options = { amount, skip };

  const filter = { directiveType: type };
  const mongoc = await mongo3.clientConnect({ concurrency: 1 });

  const configured = await mongo3.readLimit(
    mongoc,
    nconf.get('schema').directives,
    filter,
    { when: -1 },
    options.amount,
    options.skip
  );
  /*
    const expIdList = _.map(configured, 'experimentId');
    const lastweek = await mongo3
        .readLimit(mongoc, nconf.get('schema').metadata, {
            "experiment.experimentId": { "$in": expIdList }
        }, { savingTime: -1}, options.amount, options.skip);
*/

  const total = await mongo3.count(
    mongoc,
    nconf.get('schema').directives,
    filter
  );

  await mongoc.close();

  const c = _.map(configured, function (r) {
    r.humanizedWhen = moment(r.when).format('YYYY-MM-DD');
    return _.omit(r, ['_id', 'directiveType']);
  });

  /*
    recent = _.reduce(_.groupBy(_.map(lastweek, function(e) {
         return {
             publicKey: e.publicKey.substr(0, 8),
             evidencetag: e.experiment.evidencetag,
             experimentId: e.experiment.experimentId
         }
    }), 'experimentId'), function(memo, listOf, experimentId) {
        memo[experimentId] = {
            contributions: _.countBy(listOf, 'evidencetag'),
            profiles: _.countBy(listOf, 'publicKey')
        };
        return memo;
    }, {});

    debug("Directives found: %d configured %d active %d recent (type %s, max %d)",
        infos.configured.length, infos.active.length,
        infos.recent.length, type, MAX);
*/

  /* result for Taboule need to fit a standard format */
  const taboulefmt = {
    pagination: options,
    content: _.take(c, options.amount),
    total,
  };

  return {
    json: taboulefmt,
  };
}

function reproducibleTypo(title) {
  const trimmedT = title.replace(/.$/, '').replace(/^./, '');
  return trimmedT; /*
  const stats = _.countBy(_.flatten(_.chunk(trimmedT)));
  let selection = null;
  _.each(_.reverse(stats), function(amount, letter) {
    if(!selection && amount === 1)
      selection = letter;
  });
  if(!selection)
    selection = _.last(stats).letter;

  injection = ' з ';
  const chunks = trimmedT.split(selection);
  return chunks.join(injection); */
}

function chiaroScuro(videoinfo, counter) {
  // this produces three conversion of the video under test
  // and it guarantee the conversion is reproducible

  const { videoId } = utils.getNatureFromURL(videoinfo.videoURL);
  if (!videoId) {
    const m =
      'Invalid URL in shadowban experiment ' +
      videoinfo.videoURL +
      ' (expected a video URL)';
    throw new Error(m);
  }

  return _.times(3, function (mutation) {
    let sq = null;
    let mutationStr = '';
    if (mutation === 0) {
      mutationStr = 'trimming';
      sq = encodeURIComponent(reproducibleTypo(videoinfo.title));
    } else if (mutation === 1) {
      mutationStr = 'exact-title';
      sq = encodeURIComponent(videoinfo.title);
    } else if (mutation === 2) {
      mutationStr = 'videoId';
      sq = videoId;
    }

    const squri = `https://www.youtube.com/results?search_query=${sq}`;

    return {
      url: squri,
      loadFor: 15000,
      name: `${mutationStr}-video-${counter}`,
      targetVideoId: videoId,
    };
  });
}

function acquireChiaroscuro(parsedCSV) {
  if (
    _.filter(parsedCSV, function (validityCheck) {
      return (
        !_.startsWith(validityCheck.videoURL, 'http') ||
        !validityCheck.videoURL.match(/watch/) ||
        validityCheck.title.length < 5
      );
    }).length
  )
    throw new Error('Invalid parsedCSV content');

  return parsedCSV;
}

function timeconv(maybestr, defaultMs) {
  if (_.isInteger(maybestr) && maybestr > 100) {
    /* it is already ms */
    return maybestr;
  } else if (_.isInteger(maybestr) && maybestr < 100) {
    /* throw an error as it is unclear if you forgot the unit */
    throw new Error(
      'Did you forget unit? ' + maybestr + ' milliseconds is too little!'
    );
  } else if (_.isString(maybestr) && _.endsWith(maybestr, 's')) {
    return _.parseInt(maybestr) * 1000;
  } else if (_.isString(maybestr) && _.endsWith(maybestr, 'm')) {
    return _.parseInt(maybestr) * 1000 * 60;
  } else if (_.isString(maybestr) && maybestr === 'end') {
    return 'end';
  } else {
    return null;
  }
}

function comparison(videoinfo, counter) {
  return {
    ...videoinfo, // watchTime, urltag, url
    loadFor: 5000,
  };
}

function acquireComparison(parsedCSV) {
  return _.map(parsedCSV, function (o) {
    o.watchFor = timeconv(o.watchFor, 20123);
    return o;
  });
}

async function post(req) {
  const directiveType = _.get(req.params, 'directiveType', '');
  const directiveTypes = ['chiaroscuro', 'comparison'];

  if (directiveTypes.indexOf(directiveType) === -1) {
    debug(
      'Invalid directive type (%s), supported %j)',
      directiveType,
      directiveTypes
    );
    return { json: { error: true, message: 'Invalid directive type' } };
  }

  const parsedCSV = _.get(req.body, 'parsedCSV', []);

  let links = [];
  if (directiveType === directiveTypes[0])
    links = acquireChiaroscuro(parsedCSV);
  if (directiveType === directiveTypes[1]) links = acquireComparison(parsedCSV);

  debug('Registering directive %s (%d urls)', directiveType, _.size(links));

  const feedback = await automo.registerDirective(links, directiveType);
  // this feedback is printed at terminal when --csv is used
  return { json: feedback };
}

async function get(req) {
  const experimentId = req.params.experimentId;

  debug('GET: should return directives for %s', experimentId);
  const expinfo = await automo.pickDirective(experimentId);

  if (!expinfo) {
    debug('Directive fetching has failed: experimentId not found!');
    return { text: 'Invalid experimentId: not found!' };
  }

  if (expinfo.directiveType === 'chiaroscuro') {
    const directives = _.flatten(
      _.map(expinfo.links, function (vidblock, counter) {
        return chiaroScuro(vidblock, counter);
      })
    );
    debug('ChiaroScuro %s produced %d', experimentId, directives.length);
    return { json: directives };
  } else {
    // expinfo.directiveType === 'comparison'
    const directives = _.map(expinfo.links, comparison);
    debug('Comparison %s produced %d', experimentId, directives.length);
    return { json: directives };
  }
}

async function getPublic(req) {
  const whiteList = [
    // 'b3d531eca62b2dc989926e0fe21b54ab988b7f3d',
    // these ID should be collected in a proper JSON file with description
    'd75f9eaf465d2cd555de65eaf61a770c82d59451',
    '37384a9b7dff26184cdea226ad5666ca8cbbf456',
  ];

  const filter = {
    directiveType: 'comparison',
    experimentId: {
      $in: whiteList,
    },
  };

  const mongoc = await mongo3.clientConnect({ concurrency: 1 });

  const publicDirectives = await mongo3.readLimit(
    mongoc,
    nconf.get('schema').directives,
    filter,
    { when: -1 },
    20,
    0
  );

  await mongoc.close();

  return {
    json: publicDirectives,
  };
}

module.exports = {
  list,
  chiaroScuro,
  comparison,
  post,
  get,
  getPublic,
};
