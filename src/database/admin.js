const { db } = require('./connection');

/**
 * Hapus seluruh jejak user di guild ini: saldo/bank/streak, poin/XP/level,
 * inventori, quest, buff aktif, sesi voice, snapshot pekan, pemakaian /give,
 * klaim Poruv Shop, dan kontribusi damage ke boss. Baris dibuang (bukan
 * di-nol-kan) supaya state-nya benar-benar bersih; getUser/getPoints akan
 * membuat baris baru saat user aktif lagi. Mengembalikan ringkasan apa yang
 * terhapus untuk konfirmasi.
 *
 * Catatan:
 * - user_buffs hanya membersihkan buff milik member, buff guild-wide
 *   (userId = '*') sengaja dipertahankan.
 * - boss_damage tidak punya kolom guildId (PK bossId+userId), jadi cukup
 *   difilter oleh userId — userId unik lintas guild.
 * - Data staff (staff, staff_ratings, staff_activity) TIDAK ikut dihapus;
 *   itu data keanggotaan staff, bukan data member.
 */
function resetUser(userId, guildId) {
  const wipe = db.transaction(() => {
    const users = db.prepare('DELETE FROM users WHERE userId = ? AND guildId = ?').run(userId, guildId);
    const points = db.prepare('DELETE FROM points WHERE userId = ? AND guildId = ?').run(userId, guildId);
    const items = db.prepare('DELETE FROM user_items WHERE userId = ? AND guildId = ?').run(userId, guildId);
    const quests = db.prepare('DELETE FROM quests WHERE userId = ? AND guildId = ?').run(userId, guildId);
    const give = db.prepare('DELETE FROM give_daily WHERE userId = ? AND guildId = ?').run(userId, guildId);
    const buffs = db.prepare('DELETE FROM user_buffs WHERE userId = ? AND guildId = ?').run(userId, guildId);
    const voice = db.prepare('DELETE FROM voice_sessions WHERE userId = ? AND guildId = ?').run(userId, guildId);
    const weekly = db.prepare('DELETE FROM weekly_points WHERE userId = ? AND guildId = ?').run(userId, guildId);
    const bossDmg = db.prepare('DELETE FROM boss_damage WHERE userId = ?').run(userId);
    const poruv = db.prepare('DELETE FROM poruv_redemptions WHERE userId = ? AND guildId = ?').run(userId, guildId);
    return {
      users: users.changes,
      points: points.changes,
      items: items.changes,
      quests: quests.changes,
      give: give.changes,
      buffs: buffs.changes,
      voice: voice.changes,
      weekly: weekly.changes,
      bossDmg: bossDmg.changes,
      poruv: poruv.changes,
    };
  });
  return wipe();
}

module.exports = { resetUser };
