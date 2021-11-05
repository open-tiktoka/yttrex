#!/usr/bin/env node
const _ = require('lodash');
const debug = require('debug')('emergency-script:1:registerChannel');
const nconf = require('nconf');

const mongo3 = require("../lib/mongo3");
const ycai = require("../lib/ycai");

nconf.argv().env().file('config/settings.json');

const channelId = nconf.get('channelId');
const avatar = nconf.get('avatar');
const username = nconf.get('username');
const force = !!nconf.get('force');

// https://github.com/tracking-exposed/YCAI/issues/64
async function registerChannel(channelId, avatar, username, force) {
    const mongoc = await mongo3.clientConnect({ concurrency: 1 });
    const creator = await mongo3
        .readOne(mongoc, nconf.get("schema").creators, { channelId });
    await mongoc.close();

    if(creator && !force) {
        debug("Creator %O", creator);
        console.log("Creator already configured, please add --force option to override");
        process.exit(1);
    }
    
    const created = await ycai
        .confirmCreator({ channelId }, {
            avatar,
            username,
            url: "https://www.youtube.com/channel/" + channelId });

    console.log("Creator created, accessToken:", created.accessToken);
}

try {
    if(!channelId)
        return console.log("--channelId is mandatory");
    if(!avatar)
        return console.log("--avatar is mandatory");
    if(!username)
        return console.log("--username is mandatory");

    if(force)
        console.log("--force is set");

    registerChannel(channelId, avatar, username, force);
} catch(error) {
    console.log(error);
}