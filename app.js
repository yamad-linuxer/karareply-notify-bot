const twitter = require('./twClient.js');
const db = require('./db.js');
const conf = require('./config.json');
const cron = require('node-cron');

const putLog =(text)=> console.log('[ '+new Date().toLocaleString('ja')+' ] '+text);

( async ()=> {

    // target of observ
    let targetUser;
    try {
        targetUser = ( await twitter.client.get('users/search', {
            q: conf.twitter.targetUser
        }))[0];
    } catch(err) {
        console.error(err);
        return;
    };

    // Initialize
    await Promise.all([
        db.run(`CREATE TABLE IF NOT EXISTS targetsRetweets(
            origTweetId TEXT PRIMARY KEY,
            tweetAuthor TEXT,
            utcSec INTEGER
        )`),
        db.run(`CREATE TABLE IF NOT EXISTS followings(
            userId TEXT PRIMARY KEY
        )`),
        db.run(`CREATE TABLE IF NOT EXISTS followers(
            userId TEXT PRIMARY KEY
        )`)
    ]);

    // FollowBack
    cron.schedule('0 0,10,20,30,40,50 * * * *', async ()=> {
        try {

            // Download new data.
            const newFollowers = ( await twitter.client.get('followers/ids', {
                screen_name: conf.botsScreenName,
                stringify_ids: true
            })).ids;
            const newFollowings = ( await twitter.client.get('friends/ids', {
                screen_name: conf.botsScreenName,
                stringify_ids: true
            })).ids;

            const currentFollowers = ( await db.get(`SELECT userId FROM followers`)).map(i => i.userId);

            // リムられてたらこっちもリムる
            const toRemoveFollow = currentFollowers.filter(i => ! newFollowers.includes(i));
            for (const i of toRemoveFollow) {
                try {
                    await db.run(`DELETE FROM followers WHERE userId=(?)`, i);
                    await db.run(`DELETE FROM followings WHERE userId=(?)`, i);
                    await twitter.removeFriend(i);
                } catch(err) {
                    console.error(err);
                };
            };

            // Followings
            const toAddFollow = newFollowers.filter(i => ! currentFollowers.includes(i));
            for (const i of toAddFollow) {
                try {
                    await db.run(`INSERT INTO followers VALUES (?)`, i);
                    await db.run(`INSERT INTO followings VALUES (?)`, i);
                    await twitter.addFriend(i);
                } catch(err) {
                    console.error(err);
                };
            };

            putLog('FF同期完了');
        } catch(err) {
            console.error(err);
        };
    });

    // get target's tweets
    twitter.client.stream('statuses/filter', {
        follow: targetUser.id_str
    }, (stream)=> {
        stream.on('data', async (data)=> {
            if (data.user.id_str != targetUser.id_str) return;
            putLog('ツイート観測 : '+data.text);

            if (data.retweeted_status) {
                // if the tweet was retweet.
                if (
                    ( await db.get(`SELECT userId FROM followings`)).map(i => i.userId)
                        .includes(data.retweeted_status.user.id_str)
                ) {
                    try {
                        await db.run(`INSERT INTO targetsRetweets VALUES (?, ?, ?)`, [
                            data.retweeted_status.id_str,
                            data.retweeted_status.user.screen_name,
                            Math.round(new Date().getTime() / 1000)
                        ]);
                        putLog('ターゲットによるフォロー中の人のツイートのRTを観測');
                    } catch(err) {
                        console.error(err);
                    };
                };
                return;
            };

            // if the tweet was not retweet, and less duaration.
            const RTsInDb = await db.get(`SELECT * FROM targetsRetweets`);
            if (RTsInDb.length >= 1) {
                try {
                    for (const i of RTsInDb) {
                        const SN = i.tweetAuthor;
                        const tID = i.origTweetId;
                        const tDt = i.utcSec;
                        const nDt = Math.round(new Date().getTime() / 1000);

                        // after 300secs, the RT will be ignored.
                        if (nDt-tDt > 300) {
                            await db.run(`DELETE FROM targetsRetweets WHERE origTweetId = (?)`, i.origTweetId);
                            continue;
                        };

                        try {
                            await twitter.reply(`このツイートがRTされた${(nDt-tDt)}秒後に、空リプらしきものを観測しました。 https://twitter.com/${targetUser.screen_name}/status/${data.id_str}`, SN, tID);
                            await db.run(`DELETE FROM targetsRetweets WHERE origTweetId = (?)`, i.origTweetId);
                            // await db.run(`DELETE FROM targetsRetweets`);
                            putLog('空リプを観測');
                        } catch(err) {
                            console.error(err)
                        };
                    };
                } catch(err) {
                    console.error(err);
                };
            };
        });
    });

})();
