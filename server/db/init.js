const db = require('./knex');

async function init() {
  const exists = await db.schema.hasTable('messages');
  if (!exists) {
    await db.schema.createTable('messages', (table) => {
      table.increments('id').primary();
      table.string('role');
      table.text('content');
      table.timestamp('timestamp').defaultTo(db.fn.now());
    });
  }
}

module.exports = init;
