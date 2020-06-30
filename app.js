const twitter = require('./twClient.js');
const db = require('./db.js');
const conf = require('./config.json');
const cron = require('node-cron');

( async ()=> {

    // Initialize
    await Promise.all([
        db.run(`CREATE TABLE IF NOT EXISTS targetsRetweets(
            origTweetId TEXT PRIMARY KEY,
            tweetAuthor TEXT,
            date TEXT
        )`),
        db.run(`CREATE TABLE IF NOT EXISTS followings(
                userId TEXT
        )`),
        db.run(`CREATE TABLE IF NOT EXISTS followers(
            userId TEXT
        )`)
    ]);

    // FollowBack
    cron.schedule('0 0,10,20,30,40,50 * * * *', async ()=> {
        try {
            const followers = ( await twitter.client.get('followers/ids', {
                screen_name: conf.botsScreenName,
                stringify_ids: true
            })).ids;
            for (const i of followers) {
                await db.run(`INSERT INTO followers VALUES (?)`, i);
            };
            console.log('FF同期完了');
        } catch(err) {
            console.error(err);
        };
    });

    // get target's tweets
    twitter.client.stream('statuses/filter', {
        follow: conf.twitter.targetUserId
    }, (stream)=> {
        stream.on('data', async (data)=> {
            if (data.user.id_str != conf.twitter.targetUserId) return;
            console.log('ツイート観測 : '+data.text);

            if (data.retweeted_status) {
                // if the tweet was retweet, put into database.
                try {
                    await db.run(`INSERT INTO targetsRetweets VALUES (?, ?, ?)`, [
                        data.retweeted_status.id_str,
                        data.retweeted_status.user.screen_name,
                        new Date()
                    ]);
                    console.log('ターゲットによるRTを観測');
                } catch(err) {
                    console.error(err);
                };
                return;
            };

            // if the tweet was not retweet, and less duaration.
            const RTsInDb = await db.get(`SELECT * FROM targetsRetweets`);
            if (
                RTsInDb.length >= 1 &&
                true
            ) {
                try {
                    for (const i of RTsInDb) {
                        const SN = i.tweetAuthor;
                        const tID = i.origTweetId;
                        try {
                            await twitter.reply(`空リプらしきものを観測 https://twitter.com/i/status/${data.id_str}`, SN, tID);
                            await db.run(`DELETE FROM targetsRetweets WHERE origTweetId = ?`, i.origTweetId);
                            console.log('空リプを観測');
                        } catch(err) {
                            console.error(err)
                        };
                    };
                } catch(err) {
                    console.log(err);
                };
            };
        });
    });

})();
