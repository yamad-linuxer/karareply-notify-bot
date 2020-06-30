const twitter = require('./twClient.js');
const db = require('./db.js');
const conf = require('./config.json');
const cron = require('node-cron');

( async ()=> {

    // Initialize
    await db.run(`CREATE TABLE IF NOT EXISTS targetsRetweets(
            origTweetId TEXT PRIMARY KEY,
            tweetAuthor TEXT,
            date TEXT
    )`);
    await db.run(
        `CREATE TABLE IF NOT EXISTS followings(
            userId TEXT
    )`);
    await db.run(
        `CREATE TABLE IF NOT EXISTS followers(
            userId TEXT
    )`);

    // FollowBack
    cron.schedule('0 0,10,20,30,40,50 * * * *', async ()=> {
        const followers = ( await twitter.client.get('followers/ids', {
            screen_name: conf.botsScreenName,
            stringify_ids: true
        })).ids;
        for (const i of followers) {
            await db.run(`INSERT INTO followers VALUES (?)`, i);
        };
    });

    // get target's tweets
    twitter.client.stream('statuses/filter', {
        follow: conf.twitter.targetUserId
    }, (stream)=> {
        stream.on('data', async (data)=> {
            if (data.retweeted_status) {
                // if the tweet was retweet, put into database.
                await db.run(`INSERT INTO targetsRetweets VALUES (?, ?, ?)`, [
                    data.retweeted_status.id_str,
                    data.retweeted_status.user.screen_name,
                    new Date()
                ]);
            } else if (
                false
            ) {
                // if the tweet was not retweet, and less duaration.
                const SN = "hogehogebot";
                const tID = "114514"
                try {
                    await twitter.reply('空リプらしきものを観測', SN, tID);
                } catch(err) {
                    console.error(err)
                };
            };
        });
    });

})();
