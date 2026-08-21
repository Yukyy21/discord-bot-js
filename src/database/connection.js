const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

const { DATA_DIR } = require('../lib/paths');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'economy.db'));

// WAL bikin baca dan tulis tidak saling kunci — penting karena event chat dan
// voice bisa menulis bersamaan dengan slash command yang sedang membaca.
db.pragma('journal_mode = WAL');

module.exports = { db };
