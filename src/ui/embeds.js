const { EmbedBuilder } = require('discord.js');
const { e } = require('../lib/emojis');

// Warna konsisten per kategori command.
const COLORS = {
  primary: 0x5865f2,
  success: 0x57f287,
  error: 0xed4245,
  warn: 0xfee75c,
  info: 0x00a8fc,
  economy: 0xf1c40f, // /balance /daily /shop /buy /give /exchange
  points: 0xa78bfa, // /points /profile /rank
  leaderboard: 0xffb020,
  neutral: 0x2b2d31, // menyatu dengan background Discord
};

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━';

function baseEmbed() {
  return new EmbedBuilder().setColor(COLORS.primary).setFooter({ text: 'Bot Ekonomi & Poin' }).setTimestamp();
}

/** Embed dengan warna kategori + judul ber-emoji custom. */
function themedEmbed(emojiKey, title, color = COLORS.primary) {
  return baseEmbed()
    .setColor(color)
    .setTitle(`${e(emojiKey)} ${title}`);
}

function successEmbed(title, description) {
  return baseEmbed()
    .setColor(COLORS.success)
    .setTitle(`${e('success')} ${title}`)
    .setDescription(description);
}

function errorEmbed(description) {
  return baseEmbed()
    .setColor(COLORS.error)
    .setTitle(`${e('error')} Error`)
    .setDescription(description);
}

function warnEmbed(description) {
  return baseEmbed()
    .setColor(COLORS.warn)
    .setTitle(`${e('warn')} Perhatian`)
    .setDescription(description);
}

function infoEmbed(title, description) {
  return baseEmbed()
    .setColor(COLORS.info)
    .setTitle(`${e('info')} ${title}`)
    .setDescription(description);
}

/**
 * Progress bar. Pakai emoji custom `bar_fill`/`bar_empty` kalau ID-nya
 * sudah diisi di config.js; kalau belum, fallback ke blok teks.
 */
function progressBar(current, max, size = 10) {
  const ratio = max > 0 ? Math.min(Math.max(current / max, 0), 1) : 0;
  const filled = Math.round(ratio * size);
  const fill = e('bar_fill');
  const empty = e('bar_empty');
  return fill.repeat(filled) + empty.repeat(size - filled);
}

/** Bar + persentase, dipakai di embed XP. */
function progressLine(current, max, size = 10) {
  const pct = max > 0 ? Math.floor((current / max) * 100) : 0;
  return `${progressBar(current, max, size)} \`${pct}%\``;
}

module.exports = {
  COLORS,
  DIVIDER,
  baseEmbed,
  themedEmbed,
  successEmbed,
  errorEmbed,
  warnEmbed,
  infoEmbed,
  progressBar,
  progressLine,
};
