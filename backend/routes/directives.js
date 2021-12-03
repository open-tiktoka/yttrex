const _ = require('lodash');
const debug = require('debug')('routes:directives');

const automo = require('../lib/automo');
const utils = require('../lib/utils');

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

function chiaroScuro(videoinfo, experimentId, counter) {
  // this produces three conversion of the video under test
  // and it guarantee the conversion is reproducible

  const { videoId }= utils.getNatureFromURL(videoinfo.videoURL);
  if(!videoId) {
    const m = "Invalid URL in shadowban experiment " +
      videoinfo.videoURL + " (expected a video URL)";
    debug("Fatal error in experiment %s: %s", experimentId, m);
    throw new Error(m);
  }

  return _.times(3, function(mutation) {

    let sq = null;
    let mutationStr = "";
    if(mutation === 0) {
      mutationStr = "trimming";
      sq = encodeURIComponent(reproducibleTypo(videoinfo.title))
    }
    else if(mutation === 1)  {
      mutationStr = "exact-title";
      sq = encodeURIComponent(videoinfo.title);
    }
    else if(mutation === 2) {
      mutationStr = "videoId";
      sq = videoId;
    }

    const squri = `https://www.youtube.com/results?search_query=${sq}`;

    return {
      url: squri,
      loadFor: 15000,
      name: `${mutationStr}-video-${counter}`,
      targetVideoId: videoId,
    }
  });
}

function acquireChiaroscuro(parsedCSV) {
  if(_.filter(parsedCSV, function(validityCheck) {
    return (!_.startsWith(validityCheck.videoURL, "http") || 
       !validityCheck.videoURL.match(/watch/) ||
       validityCheck.title.length < 5
    )
  }).length)
    throw new Error("Invalid parsedCSV content");

  return parsedCSV;
}

function timeconv(maybestr, defaultMs) {
  if(_.isInteger(maybestr) && maybestr > 100) {
    /* it is already ms */
    return maybestr;
  } else if(_.isInteger(maybestr) && maybestr < 100) {
    /* throw an error as it is unclear if you forgot the unit */
    throw new Error("Did you forget unit? " + maybestr + " milliseconds is too little!");
  } else if(_.isString(maybestr) && _.endsWith(maybestr, 's')) {
    return _.parseInt(maybestr) * 1000;
  } else if(_.isString(maybestr) && _.endsWith(maybestr, 'm')) {
    return _.parseInt(maybestr) * 1000 * 60;
  } else if(_.isString(maybestr) && maybestr === 'end') {
    return 'end';
  } else {
    return null;
  }
}

function standardDirectives(videoinfo, counter) {
  return {
    ...videoinfo, // watchTime, urltag, url
    loadFor: 10000,
  };
}

function acquireComparison(parsedCSV) {
  return _.map(parsedCSV, function(o) { 
    o.watchFor = timeconv(o.watchFor, 20123);
    return o;
  });
}

async function post(req) {
  const directiveType = _.get(req.params, 'directiveType', "");
  const directiveTypes = [
    "chiaroscuro", "comparison"
  ];

  if(directiveTypes.indexOf(directiveType) === -1) {
    debug("Invalid directive type (%s), supported %j)",
      directiveType, directiveTypes);
    return { json: { error: true, message: "Invalid directive type"}};
  }

  const parsedCSV = _.get(req.body, 'parsedCSV', []);

  let links = [];
  if(directiveType === directiveTypes[0])
    links = acquireChiaroscuro(parsedCSV);
  if(directiveType === directiveTypes[1])
    links = acquireComparison(parsedCSV);

  debug("Registering directive %s (%d urls)",
    directiveType, _.size(links));

  const feedback = await automo
    .registerDirective(links, directiveType);
  // this feedback is printed at terminal when --csv is used
  return { json: feedback };
};

async function get(req) {
  const experimentId = req.params.experimentId;

  debug("GET: should return directives for %s", experimentId);
  const expinfo = await automo.pickDirective(experimentId);

  if(expinfo.directiveType === 'chiaroscuro') {
    const directives = _.flatten(_.map(expinfo.links, function(vidblock, counter) {
      return chiaroScuro(vidblock, experimentId, counter);
    } ));
    debug("ChiaroScuro %s produced %d", experimentId, directives.length);
    return { json: directives };
  } else {
    // expinfo.directiveType === 'comparison'
    const directives = _.map(expinfo.links, standardDirectives);
    debug("Comparison %s produced %d", experimentId, directives.length);
    return { json: directives };
  }
}



module.exports = {
  chiaroScuro,
  post,
  get,
};