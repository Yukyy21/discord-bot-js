// Penyimpanan debuff dari serangan balik mini boss.
//
// Debuff numpang di tabel `user_buffs` tapi selalu memakai key ber-prefix
// `debuff:` (lihat src/lib/bossAttacks.js). Dengan begitu query buff item lama
// tidak pernah kena imbas, dan sebaliknya. Debuff juga sengaja TIDAK lewat
// addBuff() supaya bonus durasi Endless Pulse tidak ikut memperpanjang kutukan.
const { db } = require('./connection');
const {
  DEBUFF_PREFIX,
  pickDebuff,
  isDebuffRow,
  stealAmount,
  getBossAttack,
} = require('../lib/bossAttacks');
const { getUser, updateBalance } = require('./users');

/** Semua debuff yang masih berlaku untuk satu user. */
function getActiveDebuffs(userId, guildId, now = Date.now()) {
  return db
    .prepare('SELECT * FROM user_buffs WHERE userId = ? AND guildId = ? AND key LIKE ? ORDER BY id')
    .all(userId, guildId, `${DEBUFF_PREFIX}%`)
    .filter(row => (row.expiresAt == null || row.expiresAt > now) && (row.charges == null || row.charges > 0));
}

/** Pengali debuff untuk satu key (1 = tidak sedang kena debuff itu). */
function getDebuff(userId, guildId, key, now = Date.now()) {
  return pickDebuff(getActiveDebuffs(userId, guildId, now), key, now);
}

/** Pasang satu baris debuff. */
function addDebuff(userId, guildId, { key, value = 1, durationMs = null, charges = null }, now = Date.now()) {
  db.prepare('INSERT INTO user_buffs (userId, guildId, key, value, expiresAt, charges) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, guildId, key, value, durationMs == null ? null : now + durationMs, charges);
  return { key, value, expiresAt: durationMs == null ? null : now + durationMs, charges };
}

/** Pakai satu jatah debuff berbasis charge (mis. serangan meleset). */
function consumeDebuffCharge(userId, guildId, key, now = Date.now()) {
  const row = getActiveDebuffs(userId, guildId, now).find(r => r.key === key && r.charges > 0);
  if (!row) return false;
  if (row.charges <= 1) db.prepare('DELETE FROM user_buffs WHERE id = ?').run(row.id);
  else db.prepare('UPDATE user_buffs SET charges = charges - 1 WHERE id = ?').run(row.id);
  return true;
}

/** Bersihkan semua debuff user (dipakai Chrono Core / admin reset). */
function clearDebuffs(userId, guildId) {
  return db
    .prepare('DELETE FROM user_buffs WHERE userId = ? AND guildId = ? AND key LIKE ?')
    .run(userId, guildId, `${DEBUFF_PREFIX}%`).changes;
}

/**
 * Jalankan satu serangan boss ke satu player.
 * Hasil = { attack, applied: [{key,value,...}], stolen } atau null kalau
 * serangan tidak dikenal.
 */
function applyBossAttack(userId, guildId, attackId, now = Date.now()) {
  const attack = getBossAttack(attackId);
  if (!attack) return null;

  if (attack.kind === 'steal') {
    const stolen = stealAmount(attack, getUser(userId, guildId).balance);
    if (stolen > 0) updateBalance(userId, guildId, -stolen);
    return { attack, applied: [], stolen };
  }

  const applied = (attack.effects ?? []).map(effect => addDebuff(userId, guildId, effect, now));
  return { attack, applied, stolen: 0 };
}

module.exports = {
  getActiveDebuffs,
  getDebuff,
  addDebuff,
  consumeDebuffCharge,
  clearDebuffs,
  applyBossAttack,
  isDebuffRow,
};
