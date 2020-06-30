const sqlite3 = require('sqlite3');
const conf = require('./config.json');

const db = new sqlite3.Database(conf.db.schema);

module.exports.get = async (sql, params)=> {
    db.get(sql, params, (err, row)=> {
        return err ? Promise.reject(err) : Promise.resolve(row);
    });
};

module.exports.run = async (sql, params)=> {
    db.run(sql, params, (err)=> {
        return err ? Promise.reject(err) : Promise.resolve('OK!');
    });
};
