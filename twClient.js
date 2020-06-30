const twitter = require('twitter');
const conf = require('./config.json');

const client = new twitter({
    consumer_key: conf.twitter.ck,
    consumer_secret: conf.twitter.cs,
    access_token_key: conf.twitter.atk,
    access_token_secret: conf.twitter.ats
});

const reply = async (text, SN, tId)=> {
    return await client.post('statuses/update', {
        status: '@'+SN+' '+text,
        in_reply_to_status_id: tId
    });
};

const tweet = async (text)=> {
    return await client.post('statuses/update', {status: text});
};

const addFriend = async (id)=> {
    return await client.post('friendships/create', {
        user_id: id
    });
};

const removeFriend = async (id)=> {
    return await client.post('friendships/destroy', {
        user_id: id
    });
};

module.exports.client = client;
module.exports.reply = reply;
module.exports.tweet = tweet;
module.exports.addFriend = addFriend;
module.exports.removeFriend = removeFriend
