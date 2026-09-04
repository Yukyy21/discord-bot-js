const { db } = require('./connection');
const { GIVE } = require('../config/constants');
const { localDateKey } = require('../lib/boss');

/** Kunci hari ini (YYYY-MM-DD) dalam zona waktu lokal event server. */
function todayKey(date = new Date()) {
  return localDateKey(date);
}

/** Ambil pemakaian /give user di hari ini; baris dibuat dulu kalau belum ada. */
function getGiveUsage(userId, guildId, date = new Date()) {
  const key = todayKey(date);
  let row = db
    .prepare('SELECT count, totalCoin FROM give_daily WHERE userId = ? AND guildId = ? AND dayKey = ?')
    .get(userId, guildId, key);
  if (!row) {
    db.prepare('INSERT INTO give_daily (userId, guildId, dayKey) VALUES (?, ?, ?)').run(userId, guildId, key);
    row = { count: 0, totalCoin: 0 };
  }
  return { dayKey: key, count: row.count || 0, totalCoin: row.totalCoin || 0 };
}

/**
 * Cek apakah satu transfer `amount` masih diizinkan hari ini untuk user ini.
 * Memeriksa batas jumlah transfer & batas nominal dalam satu keputusan.
 * Kembali { ok: true } bila diizinkan, atau { ok: false, reason, ...info }.
 */
function checkGiveLimit(userId, guildId, amount, date = new Date()) {
  const used = getGiveUsage(userId, guildId, date);

  if (used.count >= GIVE.DAILY_LIMIT_COUNT) {
    return {
      ok: false,
      reason: 'count',
      count: used.count,
      totalCoin: used.totalCoin,
      limitCount: GIVE.DAILY_LIMIT_COUNT,
      limitCoin: GIVE.DAILY_LIMIT_COIN,
    };
  }

  if (used.totalCoin + amount > GIVE.DAILY_LIMIT_COIN) {
    return {
      ok: false,
      reason: 'coin',
      count: used.count,
      totalCoin: used.totalCoin,
      limitCount: GIVE.DAILY_LIMIT_COUNT,
      limitCoin: GIVE.DAILY_LIMIT_COIN,
    };
  }

  return { ok: true };
}

/** Catat satu transfer `amount` ke pemakaian hari ini (panggil setelah transfer sukses). */
function recordGive(userId, guildId, amount, date = new Date()) {
  const key = todayKey(date);
  db.prepare(
    `
    INSERT INTO give_daily (userId, guildId, dayKey, count, totalCoin)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT (userId, guildId, dayKey)
    DO UPDATE SET count = count + 1, totalCoin = totalCoin + excluded.totalCoin
  `,
  ).run(userId, guildId, key, amount);
}

module.exports = { todayKey, getGiveUsage, checkGiveLimit, recordGive };
