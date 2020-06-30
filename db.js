const sqlite3 = require('sqlite3');
const conf = require('./config.json');

const db = new sqlite3.Database(conf.db.schema);

module.exports.get =(sql,params)=> {
    return new Promise((resolve, reject)=> {
        db.all(sql, params, (err, row)=> {
            if (err) reject(err);
            resolve(row);
        });
    });
};

module.exports.run =(sql, params)=> {
    return new Promise((resolve, reject)=> {
        db.run(sql, params, (err)=> {
            if (err) reject(err);
            resolve("OK!");
        });
    });
};
