// Kapan tiap user layak dikirimi pengingat mode beta berikutnya. Beda dari
// guild_config.betaMode (itu saklar on/off per server) — tabel ini melacak
// cooldown per user supaya satu orang tidak dikirimi pengingat di hampir
// tiap command yang dia jalankan.
const { db } = require('./connection');

/**
 * True kalau user ini boleh dikirimi pengingat beta sekarang (belum pernah,
 * atau cooldown sebelumnya sudah lewat).
 */
function isBetaReminderDue(userId, guildId, now = Date.now()) {
  const row = db
    .prepare('SELECT nextEligibleAt FROM beta_reminders WHERE userId = ? AND guildId = ?')
    .get(userId, guildId);
  return !row || row.nextEligibleAt <= now;
}

/** Catat bahwa pengingat baru saja dikirim; kunci cooldown sampai `nextEligibleAt`. */
function markBetaReminderSent(userId, guildId, nextEligibleAt) {
  db.prepare(
    `
    INSERT INTO beta_reminders (userId, guildId, nextEligibleAt) VALUES (?, ?, ?)
    ON CONFLICT(userId, guildId) DO UPDATE SET nextEligibleAt = excluded.nextEligibleAt
  `,
  ).run(userId, guildId, nextEligibleAt);
}

module.exports = { isBetaReminderDue, markBetaReminderSent };
