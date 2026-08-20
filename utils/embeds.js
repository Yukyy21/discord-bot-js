const { EmbedBuilder } = require('discord.js');

const COLORS = {
  primary: 0x5865f2,
  success: 0x00ff88,
  error: 0xff5555,
  warn: 0xffd700,
  info: 0x00aaff,
  points: 0xffffff,
};

function baseEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setFooter({ text: 'Bot Ekonomi & Poin' })
    .setTimestamp();
}

function successEmbed(title, description) {
  return baseEmbed().setColor(COLORS.success).setTitle(title).setDescription(description);
}

function errorEmbed(description) {
  return baseEmbed()
    .setColor(COLORS.error)
    .setTitle('❌ Error')
    .setDescription(description);
}

function infoEmbed(title, description) {
  return baseEmbed().setColor(COLORS.info).setTitle(title).setDescription(description);
}

function progressBar(current, max, size = 10) {
  const filled = Math.round((current / max) * size);
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

module.exports = { COLORS, baseEmbed, successEmbed, errorEmbed, infoEmbed, progressBar };