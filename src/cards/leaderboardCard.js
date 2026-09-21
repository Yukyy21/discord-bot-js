const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const fs = require('node:fs');
const { roundRect, drawCover, loadAvatar, fitText, FONT } = require('./canvasKit');
const { asset } = require('../lib/paths');
const {
  getBalanceLeaderboard,
  getPointsLeaderboard,
  getVoiceHoursLeaderboard,
  getLevelLeaderboard,
} = require('../database');
const { baseEmbed } = require('../ui/embeds');
const { getRank } = require('../lib/ranks');
const logger = require('../lib/logger');

const RANK_COLORS = { 1: '#ffd700', 2: '#c0c0c0', 3: '#cd7f32' };

async function buildLeaderboardCard(entries, label) {
  const rowH = 68;
  const pad = 24;
  const headerH = 64;
  const w = 700;
  const h = headerH + rowH * entries.length + pad;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Background cover-fit, condong ke BAWAH (anchorY:1) — leaderboard.jpeg
  // potret tinggi dengan lengkungan bumi di bagian bawah, jadi itu yang mau
  // dipertahankan kelihatan (bukan di-stretch paksa jadi gepeng kayak sebelumnya).
  const bgPath = asset('leaderboard', 'leaderboard.jpeg');
  if (fs.existsSync(bgPath)) {
    try {
      const bg = await loadImage(bgPath);
      drawCover(ctx, bg, 0, 0, w, h, { anchorY: 1 });
    } catch (e) {
      ctx.fillStyle = '#232428';
      ctx.fillRect(0, 0, w, h);
    }
  } else {
    ctx.fillStyle = '#232428';
    ctx.fillRect(0, 0, w, h);
  }

  roundRect(ctx, 0, 0, w, h, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 30px ${FONT.display}`;
  ctx.fillText(`Leaderboard ${label}`, pad, 46);

  const images = await Promise.all(entries.map(e => loadAvatar(e.avatar, e.name, 64)));

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const y = headerH + i * rowH;

    // Baris 1 (rank #1) sengaja dibiarkan tanpa panel gelap — badge emasnya
    // sudah cukup menonjol sendiri, zebra-stripe baru mulai dari baris ke-2.
    if (i > 0 && i % 2 === 0) {
      ctx.fillStyle = '#2b2d31';
      roundRect(ctx, pad, y, w - pad * 2, rowH - 8, 14);
      ctx.fill();
    }

    const badgeColor = RANK_COLORS[e.rank] || '#4e5058';
    const badgeCy = y + rowH / 2 - 4;
    ctx.beginPath();
    ctx.arc(42, badgeCy, 18, 0, Math.PI * 2);
    ctx.fillStyle = badgeColor;
    ctx.fill();
    ctx.fillStyle = RANK_COLORS[e.rank] ? '#000000' : '#ffffff';
    ctx.font = `bold 17px ${FONT.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(e.rank), 42, badgeCy + 1);

    const img = images[i];
    const avatarCx = 80;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCx, badgeCy, 22, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, avatarCx - 22, badgeCy - 22, 44, 44);
    ctx.restore();
    // Ring tipis di sekeliling avatar biar kelihatan lebih "premium", tidak nempel polos ke bg.
    ctx.beginPath();
    ctx.arc(avatarCx, badgeCy, 22, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    fitText(ctx, e.name, 118, badgeCy + 7, w - pad - 118 - 170, { size: 20, minSize: 13 });

    ctx.fillStyle = '#b5bac1';
    ctx.font = `16px ${FONT.body}`;
    ctx.textAlign = 'right';
    ctx.fillText(`${e.value} ${label}`, w - pad - 4, badgeCy + 6);
    ctx.textAlign = 'left';
  }

  return canvas.toBuffer('image/png');
}

async function renderLeaderboardCard(interaction, kategori) {
  if (interaction.isStringSelectMenu()) {
    try {
      await interaction.deferUpdate();
    } catch {
      return; // interaksi sudah expired atau sudah di-acknowledge, abaikan
    }
  }

  let rows;
  let label;
  let isBalance = false;

  if (kategori === 'voice') {
    rows = getVoiceHoursLeaderboard(interaction.guildId, 10);
    label = 'Jam Voice';
  } else if (kategori === 'rank') {
    rows = getLevelLeaderboard(interaction.guildId, 10);
    label = 'Rank';
  } else {
    isBalance = kategori === 'balance';
    rows = isBalance
      ? getBalanceLeaderboard(interaction.guildId, 10)
      : getPointsLeaderboard(interaction.guildId, 10);
    label = isBalance ? 'Coin' : 'Poruv';
  }

  if (rows.length === 0) {
    const send = interaction.deferred
      ? interaction.editReply.bind(interaction)
      : interaction.reply.bind(interaction);
    return send({ embeds: [baseEmbed().setDescription('Belum ada data di server ini.')], components: [] });
  }

  const users = await Promise.all(
    rows.map(async row => {
      const cached = interaction.client.users.cache.get(row.userId);
      if (cached) return cached;
      try {
        return await interaction.client.users.fetch(row.userId);
      } catch (error) {
        logger.error(`Gagal fetch user ${row.userId}:`, error.message);
        return null;
      }
    }),
  );

  const entries = rows.map((row, i) => {
    const user = users[i];
    let value;
    if (kategori === 'voice') {
      const hours = Math.floor((row.voice_seconds || 0) / 3600);
      const minutes = Math.floor(((row.voice_seconds || 0) % 3600) / 60);
      value = hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`;
    } else if (kategori === 'rank') {
      const rankInfo = getRank(row.level);
      value = `Lv.${row.level} ${rankInfo.name}`;
    } else {
      value = (isBalance ? row.balance : row.points).toLocaleString();
    }
    return {
      rank: i + 1,
      name: user ? user.displayName : 'Unknown User',
      avatar: user ? user.displayAvatarURL({ extension: 'png', size: 128 }) : null,
      value,
    };
  });

  if (entries.length === 0) {
    const send = interaction.deferred
      ? interaction.editReply.bind(interaction)
      : interaction.reply.bind(interaction);
    return send({
      embeds: [baseEmbed().setDescription('Belum ada data yang bisa ditampilkan di server ini.')],
      components: [],
    });
  }

  const buffer = await buildLeaderboardCard(entries, label);
  const file = new AttachmentBuilder(buffer, { name: 'leaderboard.png' });

  const select = new StringSelectMenuBuilder()
    .setCustomId('lb_filter')
    .setPlaceholder('Filter kategori')
    .addOptions(
      { label: 'Coin', value: 'balance' },
      { label: 'Poruv', value: 'points' },
      { label: 'Jam Voice', value: 'voice' },
      { label: 'Rank', value: 'rank' },
    );
  const row = new ActionRowBuilder().addComponents(select);

  const send = interaction.deferred
    ? interaction.editReply.bind(interaction)
    : interaction.reply.bind(interaction);

  await send({ files: [file], components: [row] });
}

module.exports = { buildLeaderboardCard, renderLeaderboardCard };
