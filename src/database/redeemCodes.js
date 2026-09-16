const { db } = require('./connection');
const { updateBalance } = require('./users');
const { addPoints, addXp } = require('./points');
const { addBuff } = require('./buffs');
const { grantItem, getShopItems } = require('./shop');
const { normalizeCode } = require('../lib/redeemCodes');

function rowToCode(row) {
  if (!row) return null;
  return { ...row, rewards: JSON.parse(row.rewards) };
}

function getRedeemCode(guildId, code) {
  const row = db
    .prepare('SELECT * FROM redeem_codes WHERE guildId = ? AND code = ?')
    .get(guildId, normalizeCode(code));
  return rowToCode(row);
}

/**
 * Buat code redeem baru. `rewards` sudah dalam bentuk tervalidasi (lihat
 * lib/redeemCodes.js untuk parsing input modal). expiresAt/maxUses null =
 * tidak ada batas.
 */
function createRedeemCode(guildId, { code, createdBy, expiresAt = null, maxUses = null, rewards }) {
  const normalized = normalizeCode(code);
  const existing = getRedeemCode(guildId, normalized);
  if (existing) return { ok: false, message: `Code \`${normalized}\` sudah ada. Pakai nama lain.` };

  db.prepare(
    `INSERT INTO redeem_codes (code, guildId, createdBy, createdAt, expiresAt, maxUses, usesCount, rewards)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(normalized, guildId, createdBy, Date.now(), expiresAt, maxUses, JSON.stringify(rewards));

  return { ok: true, code: normalized };
}

/**
 * Redeem satu code: validasi (ada, belum expired, kuota belum habis, user
 * belum pernah pakai), lalu terapkan semua reward + catat pemakaian dalam
 * satu transaksi. Mengembalikan { ok, message, rewards } — reward XP butuh
 * reconcileLevels susulan di command (levelingManager butuh Discord client).
 */
function redeemCode(userId, guildId, code, now = Date.now()) {
  const entry = getRedeemCode(guildId, code);
  if (!entry) return { ok: false, message: 'Code tidak ditemukan. Cek lagi penulisannya.' };
  if (entry.expiresAt != null && entry.expiresAt <= now) {
    return { ok: false, message: 'Code ini sudah kedaluwarsa.' };
  }
  if (entry.maxUses != null && entry.usesCount >= entry.maxUses) {
    return { ok: false, message: 'Kuota redeem code ini sudah habis.' };
  }
  const used = db
    .prepare('SELECT 1 FROM redeem_code_uses WHERE code = ? AND guildId = ? AND userId = ?')
    .get(entry.code, guildId, userId);
  if (used) return { ok: false, message: 'Kamu sudah pernah redeem code ini.' };

  const apply = db.transaction(() => {
    for (const reward of entry.rewards) {
      if (reward.type === 'poruv') addPoints(userId, guildId, reward.amount);
      else if (reward.type === 'xp') addXp(userId, guildId, reward.amount);
      else if (reward.type === 'coin') updateBalance(userId, guildId, reward.amount);
      else if (reward.type === 'buff') {
        addBuff(userId, guildId, { key: reward.key, value: reward.value, durationMs: reward.durationMinutes * 60 * 1000 }, now);
      } else if (reward.type === 'item') {
        for (const it of reward.items) grantItem(userId, guildId, it.itemId, it.qty);
      }
    }
    db.prepare('INSERT INTO redeem_code_uses (code, guildId, userId, redeemedAt) VALUES (?, ?, ?, ?)').run(
      entry.code,
      guildId,
      userId,
      now,
    );
    db.prepare('UPDATE redeem_codes SET usesCount = usesCount + 1 WHERE code = ? AND guildId = ?').run(
      entry.code,
      guildId,
    );
  });
  apply();

  const hasXp = entry.rewards.some(r => r.type === 'xp');
  return { ok: true, rewards: entry.rewards, hasXp };
}

/** Nama item untuk ditampilkan di ringkasan reward (dipakai lib/redeemCodes describeRewards). */
function itemNameById(itemId) {
  return getShopItems().find(i => i.id === itemId)?.name ?? null;
}

module.exports = { getRedeemCode, createRedeemCode, redeemCode, itemNameById };
