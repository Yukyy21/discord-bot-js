// Pengingat mode beta (/beta), versi "numpang di command apapun" — bukan
// broadcast ke satu channel tetap. Dipanggil sekali dari interactionCreate.js
// setelah command apa pun sukses jalan: kalau guild lagi mode beta dan user
// itu belum lihat pengingat dalam jeda acak terakhir, kirim satu followUp
// ephemeral (cuma dia yang lihat, tidak mengganggu command yang sedang dia
// pakai) lalu kunci cooldown 40-90 menit sebelum dia bisa lihat lagi.
const { MessageFlags } = require('discord.js');
const { getBetaMode, isBetaReminderDue, markBetaReminderSent } = require('../database');
const { BETA } = require('../config/constants');
const { e } = require('./emojis');
const log = require('./logger').scope('Beta');

function betaMessage() {
  return (
    `${e('betatester')} Bot ini masih **beta**. Kalau kalian menemukan bug atau kesalahan, ` +
    `silahkan laporkan lewat \`/report type:bug\`.\n` +
    `Kalian juga bisa pakai \`/report type:saran\` untuk memberikan saran.`
  );
}

/** Jeda acak berikutnya sebelum user ini layak dikirimi pengingat lagi. */
function nextCooldownMs() {
  const { MIN_INTERVAL_MS, MAX_INTERVAL_MS } = BETA;
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

/**
 * Kirim pengingat beta lewat followUp ephemeral kalau syaratnya terpenuhi:
 * guild sedang mode beta, dan user belum kena pengingat dalam cooldown
 * terakhir. Aman dipanggil di command manapun — no-op diam-diam kalau
 * syarat tidak terpenuhi atau followUp gagal (mis. interaksi sudah lewat
 * window Discord), supaya tidak pernah mengganggu command aslinya.
 */
async function maybeSendBetaReminder(interaction) {
  const guildId = interaction.guildId;
  if (!guildId) return; // DM tidak punya konsep guild_config
  // followUp butuh interaksi sudah dibalas/di-defer duluan oleh command asli.
  if (!interaction.replied && !interaction.deferred) return;

  if (!getBetaMode(guildId)) return;

  const userId = interaction.user.id;
  if (!isBetaReminderDue(userId, guildId)) return;

  // Kunci cooldown DULU sebelum kirim — kalau followUp gagal di tengah jalan,
  // lebih aman "kelewat satu giliran" daripada spam retry di command berikutnya.
  markBetaReminderSent(userId, guildId, Date.now() + nextCooldownMs());

  try {
    await interaction.followUp({ content: betaMessage(), flags: MessageFlags.Ephemeral });
  } catch (error) {
    log.error(`Gagal kirim pengingat beta ke ${userId}:`, error.message);
  }
}

module.exports = { maybeSendBetaReminder, betaMessage };
