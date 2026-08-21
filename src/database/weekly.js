const { db } = require('./connection');
const { weeklyKey } = require('../lib/quests');

/**
 * Catat poin yang didapat user di pekan berjalan. Dipanggil otomatis dari
 * addPoints() supaya semua sumber poin (chat, voice, exchange) terhitung
 * tanpa perlu hook terpisah. Pekan baru = kunci periode baru = mulai dari
 * nol; baris pekan lama tetap tersimpan sebagai riwayat.
 */
function addWeeklyPoints(userId, guildId, amount) {
  db.prepare(`
    INSERT INTO weekly_points (userId, guildId, period, points)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (userId, guildId, period)
    DO UPDATE SET points = points + excluded.points
  `).run(userId, guildId, weeklyKey(), amount);
}

/** Papan peringkat poin pekan berjalan. */
function getWeeklyLeaderboard(guildId, limit = 10) {
  return db.prepare(`
    SELECT userId, points FROM weekly_points
    WHERE guildId = ? AND period = ?
    ORDER BY points DESC LIMIT ?
  `).all(guildId, weeklyKey(), limit);
}

module.exports = { addWeeklyPoints, getWeeklyLeaderboard };
