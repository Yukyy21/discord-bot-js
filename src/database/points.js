const { db } = require('./connection');

/** Ambil baris poin/XP; dibuat dulu kalau user belum pernah tercatat. */
function getPoints(userId, guildId) {
  let row = db.prepare('SELECT * FROM points WHERE userId = ? AND guildId = ?').get(userId, guildId);
  if (!row) {
    db.prepare('INSERT INTO points (userId, guildId) VALUES (?, ?)').run(userId, guildId);
    row = db.prepare('SELECT * FROM points WHERE userId = ? AND guildId = ?').get(userId, guildId);
  }
  return row;
}

function addPoints(userId, guildId, amount) {
  getPoints(userId, guildId);
  db.prepare('UPDATE points SET points = points + ? WHERE userId = ? AND guildId = ?').run(amount, userId, guildId);
}

function addXp(userId, guildId, amount) {
  getPoints(userId, guildId);
  db.prepare('UPDATE points SET xp = xp + ? WHERE userId = ? AND guildId = ?').run(amount, userId, guildId);
}

function addVoiceSeconds(userId, guildId, seconds) {
  getPoints(userId, guildId);
  db.prepare('UPDATE points SET voice_seconds = voice_seconds + ? WHERE userId = ? AND guildId = ?')
    .run(seconds, userId, guildId);
}

/**
 * Sisa kata yang belum genap satu poin. Disimpan biar pesan-pesan pendek tetap
 * terakumulasi, bukan hangus tiap pesan.
 */
function setPendingWords(userId, guildId, words) {
  db.prepare('UPDATE points SET pendingWords = ? WHERE userId = ? AND guildId = ?').run(words, userId, guildId);
}

/** Dipakai saat naik level: set level baru sekaligus sisa XP-nya. */
function setLevel(userId, guildId, level, remainingXp) {
  db.prepare('UPDATE points SET level = ?, xp = ? WHERE userId = ? AND guildId = ?')
    .run(level, remainingXp, userId, guildId);
}

function getPointsLeaderboard(guildId, limit = 10) {
  return db.prepare('SELECT * FROM points WHERE guildId = ? ORDER BY points DESC LIMIT ?').all(guildId, limit);
}

function getVoiceHoursLeaderboard(guildId, limit = 10) {
  return db.prepare('SELECT * FROM points WHERE guildId = ? ORDER BY voice_seconds DESC LIMIT ?').all(guildId, limit);
}

function getLevelLeaderboard(guildId, limit = 10) {
  return db.prepare('SELECT * FROM points WHERE guildId = ? ORDER BY level DESC, xp DESC LIMIT ?').all(guildId, limit);
}

/** Posisi user di papan level (1 = teratas). Null kalau belum punya data. */
function getXpRank(userId, guildId) {
  const row = db.prepare('SELECT * FROM points WHERE userId = ? AND guildId = ?').get(userId, guildId);
  if (!row) return null;
  const above = db.prepare(
    'SELECT COUNT(*) AS c FROM points WHERE guildId = ? AND (level > ? OR (level = ? AND xp > ?))',
  ).get(guildId, row.level, row.level, row.xp);
  return above.c + 1;
}

module.exports = {
  getPoints,
  addPoints,
  addXp,
  addVoiceSeconds,
  setPendingWords,
  setLevel,
  getPointsLeaderboard,
  getVoiceHoursLeaderboard,
  getLevelLeaderboard,
  getXpRank,
};
