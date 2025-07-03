const knex = require('knex');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: __dirname + '/db.sqlite'
  },
  useNullAsDefault: true
});

module.exports = db;
