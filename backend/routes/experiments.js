const _ = require('lodash');
const moment = require('moment');
const debug = require('debug')('routes:experiments');
const nconf = require('nconf');

const automo = require('../lib/automo');
const params = require('../lib/params');
const CSV = require('../lib/CSV');
const mongo3 = require('../lib/mongo3');

async function sharedDataPull(filter) {
  /* this function is invoked by the various API below */
  const MAX = 3000;
  const mongoc = await mongo3.clientConnect({ concurrency: 1 });
  const metadata = await mongo3.readLimit(
    mongoc,
    nconf.get('schema').metadata,
    filter,
    { savingTime: -1 },
    MAX,
    0
  );
  await mongoc.close();

  debug(
    'Found %d available data by filter %o (max %d) %j',
    metadata.length,
    filter,
    MAX,
    _.countBy(metadata, 'type')
  );
  return metadata;
}

// function dotify(data) {
//     const dot = Object({links: [], nodes: []})
//     dot.links = _.map(data, function(video) {
//         return {
//             target:
//                 video.profile + '—' +
//                 video.expnumber + '—' +
//                 moment(video.savingTime).format("dddd"),
//             source: video.recommendedVideoId,
//             value: 1
//         } });
//     const vList = _.uniq(_.map(data, function(video) { return video.recommendedVideoId }));
//     const videoObject = _.map(vList, function(v) { return { id: v, group: 1 }});
//     const pList = _.uniq(_.map(data, function(video) {
//         return video.profile + '—' +
//                video.expnumber + '—' +
//                moment(video.savingTime).format("dddd")
//     }));
//     const pseudoObject = _.map(pList, function(v) { return { id: v, group: 2 }});
//     dot.nodes = _.concat(videoObject, pseudoObject);
//     return dot;
// }

async function dot(req) {
  throw new Error("Remind this can't work because metadata has many type");

  // const experiment = params.getString(req, 'experimentId', true);
  // const metadata = await sharedDataPull(experiment);

  // if(!_.size(related))
  //     return { json: {error: true, message: "No data found with such parameters"}}

  // const grouped = _.groupBy(related, 'videoName');
  // const dotchain = _.map(grouped, function(vidlist, videoName) {
  //     return {
  //         videoName,
  //         dotted: dotify(vidlist)
  //     };
  // })
  // return { json: dotchain };
}

async function json(req) {
  const experimentId = params.getString(req, 'experimentId', true);
  const metadata = await sharedDataPull({
    'experiment.experimentId': experimentId,
  });
  return { json: metadata };
}

async function csv(req) {
  const type = req.params.type;
  if (CSV.allowedTypes.indexOf(type) === -1) {
    debug('Invalid requested data type? %s', type);
    return { text: 'Error, invalid URL composed' };
  }

  const experimentId = params.getString(req, 'experimentId', true);
  const metadata = await sharedDataPull({
    'experiment.experimentId': experimentId,
    type,
  });

  const transformed = CSV.unrollNested(metadata, {
    type,
    experiment: true,
    private: true,
  });

  const textcsv = CSV.produceCSVv1(transformed);
  debug(
    'Fetch %d metadata(s), and converted in a %d CSV',
    _.size(metadata),
    _.size(textcsv)
  );

  const filename = `experiment-${experimentId.substr(0, 8)}-${type}-${
    transformed.length
  }.csv`;
  return {
    text: textcsv,
    headers: {
      'Content-Type': 'csv/text',
      'Content-Disposition': 'attachment; filename=' + filename,
    },
  };
}

async function channel3(req) {
  // this is invoked as handshake, and might return information
  // helpful for the extension, about the experiment running.
  const fields = [
    'href',
    'experimentId',
    'evidencetag',
    'execount',
    'newProfile',
    'profileName',
    'directiveType',
  ];
  const experimentInfo = _.pick(req.body, fields);

  experimentInfo.testName = new Date(req.body.when);
  experimentInfo.publicKey = _.get(req.body, 'config.publicKey');

  const retval = await automo.saveExperiment(experimentInfo);
  /* this is the default answer, as normally there is not an
   * experiment running */
  if (_.isNull(retval)) return { json: { experimentId: false } };

  debug(
    "Marked experiment as 'active' — %j",
    _.pick(retval, ['evidencetag', 'execount', 'directiveType'])
  );
  return { json: retval };
}

async function conclude3(req) {
  const testTime = req.params.testTime;
  debug('Conclude3 received: %s', testTime);
  if (testTime.length < 10) return { status: 403 };

  const test = moment(testTime);
  if (!test.isValid) return { status: 403 };

  const retval = await automo.concludeExperiment(testTime);
  // retval is {"acknowledged":true,"modifiedCount":0,"upsertedId":null,"upsertedCount":0,"matchedCount":0}
  return { json: retval };
}

module.exports = {
  /* used by the webapps */
  csv,
  dot,
  json,

  /* used by the browser extension/guardoni */
  channel3,
  conclude3,
};
