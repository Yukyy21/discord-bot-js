// Statistik global bot (key-value), dipakai antara lain buat rotate status.
// Tersimpan di tabel bot_stats supaya tahan restart.
const { db } = require('./connection');

/** Tambah counter sebesar `by` (default 1), buat baris baru kalau belum ada. */
function increment(key, by = 1) {
  db.prepare(
    `
    INSERT INTO bot_stats (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = value + excluded.value
  `,
  ).run(key, by);
}

/** Ambil nilai counter, 0 kalau belum pernah diisi. */
function get(key) {
  return db.prepare('SELECT value FROM bot_stats WHERE key = ?').get(key)?.value ?? 0;
}

module.exports = { increment, get };

