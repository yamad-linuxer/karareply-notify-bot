const twitter = require('twitter');
const conf = require('./config.json');

const client = new twitter({
    consumer_key: conf.twitter.ck,
    consumer_secret: conf.twitter.cs,
    access_token_key: conf.twitter.atk,
    access_token_secret: conf.twitter.ats
});

const reply = async (text, SN, tId)=> {
    return client.post('statuses/update', {
        status: '@'+SN+' '+text,
        in_reply_to_status_id: tId
    });
};

const tweet = async (text)=> {
    return client.post('statuses/update', {status: text});
};

module.exports.client = client;
module.exports.reply = reply;
module.exports.tweet = tweet;
