const { db } = require('./connection');

/**
 * Hapus seluruh jejak user di guild ini: saldo/bank/streak, poin/XP/level,
 * inventori, dan quest. Baris dibuang (bukan di-nol-kan) supaya state-nya
 * benar-benar bersih; getUser/getPoints akan membuat baris baru saat user
 * aktif lagi. Mengembalikan ringkasan apa yang terhapus untuk konfirmasi.
 */
function resetUser(userId, guildId) {
  const wipe = db.transaction(() => {
    const users = db.prepare('DELETE FROM users WHERE userId = ? AND guildId = ?').run(userId, guildId);
    const points = db.prepare('DELETE FROM points WHERE userId = ? AND guildId = ?').run(userId, guildId);
    const items = db.prepare('DELETE FROM user_items WHERE userId = ? AND guildId = ?').run(userId, guildId);
    const quests = db.prepare('DELETE FROM quests WHERE userId = ? AND guildId = ?').run(userId, guildId);
    return { users: users.changes, points: points.changes, items: items.changes, quests: quests.changes };
  });
  return wipe();
}

module.exports = { resetUser };
