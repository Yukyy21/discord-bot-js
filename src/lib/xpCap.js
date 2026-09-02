const { CHAT } = require('../config/constants');

// Jendela XP bergulir per user. Key `guildId:userId` → array { ts, xp } dari
// XP yang benar-benar terbayar di jendela berjalan. Multiplier chat kadang
// gede, jadi di sini XP yang sudah dikali buff ikut dijumlahkan.
const windows = new Map();
const MAX_TRACKED = 2000;

function pruneAll(now) {
  const cutoff = now - CHAT.XP_CAP_WINDOW_MS;
  for (const [key, list] of windows) {
    while (list.length && list[0].ts <= cutoff) list.shift();
    if (!list.length) windows.delete(key);
  }
}

function sumWindow(list, now) {
  const cutoff = now - CHAT.XP_CAP_WINDOW_MS;
  while (list.length && list[0].ts <= cutoff) list.shift();
  let used = 0;
  for (const entry of list) used += entry.xp;
  return used;
}

/**
 * Plafon XP chat per menit per user (jendela bergulir). `xp` adalah XP yang
 * sudah dikali multiplier. Mengembalikan XP yang benar-benar dibayarkan —
 * 0 kalau plafon sudah penuh — lalu mencatat pembayaran itu ke jendela.
 * Chat aktif di bawah plafon tidak terpengaruh; spam (20 pesan × 20 XP per
 * menit) beratnya dipotong ke plafon.
 */
function capChatXp(userId, guildId, xp, now = Date.now()) {
  if (xp <= 0) return 0;
  if (windows.size > MAX_TRACKED) pruneAll(now);

  const key = `${guildId}:${userId}`;
  let list = windows.get(key);
  if (!list) {
    list = [];
    windows.set(key, list);
  }

  const used = sumWindow(list, now);
  const available = Math.max(0, CHAT.XP_CAP_PER_MINUTE - used);
  const granted = Math.min(xp, available);
  if (granted > 0) list.push({ ts: now, xp: granted });
  return granted;
}

/** Time Skip: lupakan jendela XP chat user supaya plafonnya reset. */
function resetXpCap(userId, guildId) {
  windows.delete(`${guildId}:${userId}`);
}

module.exports = { capChatXp, resetXpCap };