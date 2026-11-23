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
 * - boss_damage tidak punya kolom guildId (PK bossId+userId), tapi bossId
 *   selalu terikat satu guild lewat boss_spawns.guildId — jadi difilter
 *   lewat subquery ke boss_spawns, BUKAN cuma userId. Kalau cuma userId,
 *   damage user itu ke boss di guild lain ikut terhapus juga (userId unik
 *   lintas guild justru bikin over-delete, bukan pengaman).
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
    const voice = db
      .prepare('DELETE FROM voice_sessions WHERE userId = ? AND guildId = ?')
      .run(userId, guildId);
    const weekly = db
      .prepare('DELETE FROM weekly_points WHERE userId = ? AND guildId = ?')
      .run(userId, guildId);
    const bossDmg = db
      .prepare(
        'DELETE FROM boss_damage WHERE userId = ? AND bossId IN (SELECT id FROM boss_spawns WHERE guildId = ?)',
      )
      .run(userId, guildId);
    const poruv = db
      .prepare('DELETE FROM poruv_redemptions WHERE userId = ? AND guildId = ?')
      .run(userId, guildId);
    const redeemUses = db
      .prepare('DELETE FROM redeem_code_uses WHERE userId = ? AND guildId = ?')
      .run(userId, guildId);
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
      redeemUses: redeemUses.changes,
    };
  });
  return wipe();
}

function resetGuildMembers(guildId, voiceSessions = []) {
  if (typeof guildId !== 'string' || !guildId.trim()) throw new TypeError('guildId is required');
  return db.transaction(() => {
    const result = {};
    for (const table of [
      'users',
      'points',
      'user_items',
      'quests',
      'give_daily',
      'voice_sessions',
      'weekly_points',
      'poruv_redemptions',
      'redeem_code_uses',
      'beta_reminders',
      'staff_ratings',
      'staff_activity',
      'staff',
    ]) {
      result[table] = db.prepare(`DELETE FROM ${table} WHERE guildId = ?`).run(guildId).changes;
    }
    result.user_buffs = db
      .prepare("DELETE FROM user_buffs WHERE guildId = ? AND userId != '*'")
      .run(guildId).changes;
    result.boss_damage = db
      .prepare('DELETE FROM boss_damage WHERE bossId IN (SELECT id FROM boss_spawns WHERE guildId = ?)')
      .run(guildId).changes;
    db.prepare('UPDATE boss_spawns SET lastHitUserId = NULL WHERE guildId = ?').run(guildId);
    const save = db.prepare(
      'INSERT INTO voice_sessions (userId, guildId, joinedAt, lastGrant, eligible) VALUES (?, ?, ?, ?, ?)',
    );
    for (const session of voiceSessions) {
      save.run(session.userId, guildId, session.joinedAt, session.lastGrant, Number(session.eligible));
    }
    return result;
  })();
}

module.exports = { resetUser, resetGuildMembers };
