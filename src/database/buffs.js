const { db } = require('./connection');
const { pickMultiplier, applyMultiplier, withDurationBonus, isActive } = require('../lib/buffs');
const { isDebuffRow, pickDebuff, DEBUFF_PREFIX } = require('../lib/bossAttacks');

const GUILD_WIDE = '*';

/** Semua buff yang masih berlaku untuk user, termasuk buff se-guild. */
function getActiveBuffs(userId, guildId, now = Date.now()) {
  const rows = db
    .prepare('SELECT * FROM user_buffs WHERE guildId = ? AND userId IN (?, ?) ORDER BY id')
    .all(guildId, userId, GUILD_WIDE);
  return rows.filter(row => isActive(row, now) && !isDebuffRow(row));
}

function getMultiplier(userId, guildId, key, now = Date.now()) {
  return pickMultiplier(getActiveBuffs(userId, guildId, now), key, now);
}

/**
 * Kalikan nilai reward dengan buff yang sedang aktif, lalu dengan debuff boss
 * yang sejenis (kalau ada). Buff item dihitung duluan dan tidak pernah
 * dibatalkan — debuff hanya mengalikan hasil akhirnya.
 */
function applyBuff(userId, guildId, key, amount, now = Date.now()) {
  const buffed = applyMultiplier(amount, getMultiplier(userId, guildId, key, now));
  return Math.round(buffed * getDebuffMultiplier(userId, guildId, key, now));
}

/** Pengali debuff boss untuk key buff biasa ('coin' -> 'debuff:coin'). */
function getDebuffMultiplier(userId, guildId, key, now = Date.now()) {
  const debuffKey = `${DEBUFF_PREFIX}${key}`;
  const rows = db
    .prepare('SELECT * FROM user_buffs WHERE userId = ? AND guildId = ? AND key = ?')
    .all(userId, guildId, debuffKey);
  return pickDebuff(rows, debuffKey, now);
}

/**
 * Pasang buff baru. Durasi otomatis diperpanjang kalau user sedang punya buff
 * `duration` (Endless Pulse); buff `duration` sendiri tidak memperpanjang diri.
 */
function addBuff(userId, guildId, { key, value = 1, durationMs = null, charges = null }, now = Date.now()) {
  const bonus = key === 'duration' ? 1 : getMultiplier(userId, guildId, 'duration', now);
  const ms = withDurationBonus(durationMs, bonus);
  db.prepare(
    'INSERT INTO user_buffs (userId, guildId, key, value, expiresAt, charges) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(userId, guildId, key, value, ms == null ? null : now + ms, charges);
  return { key, value, expiresAt: ms == null ? null : now + ms, charges };
}

/** Buff yang berlaku untuk semua member guild (Astral Rift). */
function addGuildBuff(guildId, buff, now = Date.now()) {
  return addBuff(GUILD_WIDE, guildId, buff, now);
}

/** Rekindle: tambah sisa waktu semua buff berdurasi milik user. */
function extendBuffs(userId, guildId, extraMs, now = Date.now()) {
  // Debuff sengaja tidak ikut diperpanjang (getActiveBuffs sudah menyaringnya).
  const rows = getActiveBuffs(userId, guildId, now).filter(r => r.userId === userId && r.expiresAt != null);
  const update = db.prepare('UPDATE user_buffs SET expiresAt = ? WHERE id = ?');
  const run = db.transaction(() => {
    for (const row of rows) update.run(row.expiresAt + extraMs, row.id);
  });
  run();
  return rows.length;
}

/** Sturdy: pakai satu jatah "item tidak habis". True kalau jatahnya ada. */
function consumeCharge(userId, guildId, key, now = Date.now()) {
  const row = getActiveBuffs(userId, guildId, now).find(r => r.key === key && r.charges > 0);
  if (!row) return false;
  if (row.charges <= 1) db.prepare('DELETE FROM user_buffs WHERE id = ?').run(row.id);
  else db.prepare('UPDATE user_buffs SET charges = charges - 1 WHERE id = ?').run(row.id);
  return true;
}

/** Buang baris buff yang sudah lewat waktunya supaya tabel tidak menumpuk. */
function clearExpiredBuffs(now = Date.now()) {
  return db
    .prepare('DELETE FROM user_buffs WHERE (expiresAt IS NOT NULL AND expiresAt <= ?) OR charges <= 0')
    .run(now).changes;
}

module.exports = {
  GUILD_WIDE,
  getActiveBuffs,
  getMultiplier,
  getDebuffMultiplier,
  applyBuff,
  addBuff,
  addGuildBuff,
  extendBuffs,
  consumeCharge,
  clearExpiredBuffs,
};
