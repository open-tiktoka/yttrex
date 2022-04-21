import * as _ from 'lodash';

async function submit(req) {
/* somehow, even if I handled many POSTs in express, in this
 * case I'm not getting any data, even if network inspection
 * confirm that have been send */
  console.log(req.query);
  console.log(req.body);
  console.log(req.params);
  console.log(_.keys(req));
  const url = req.body?.url;
  console.log(url);
  try {
    const urlo = new URL(url);
    console.log(urlo.pathname, urlo.hostname);
  } catch(error) {
    console.log(error.message);
  }
  return {
    json: {
      supported: true,
      text: "under development, received " + url,
    }
  }
}
module.exports = {
  submit
}