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
const { seasonControls } = require('../ui/season');
const { getRank } = require('../lib/ranks');
const logger = require('../lib/logger');

const RANK_COLORS = { 1: '#ffbe55', 2: '#d5dee9', 3: '#edb48e' };

async function buildLeaderboardCard(entries, label) {
  const w = 1000;
  const pad = 36;
  const headerH = 148;
  const rowH = 84;
  const leaderH = 124;
  const gap = 8;
  const contentH = entries.reduce((total, entry) => total + (entry.rank === 1 ? leaderH : rowH) + gap, 0);
  const h = headerH + Math.max(contentH, 100) + 60;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const amber = RANK_COLORS[1];
  const muted = '#c7cbd2';

  roundRect(ctx, 0, 0, w, h, 26);
  ctx.clip();
  ctx.fillStyle = '#10151e';
  ctx.fillRect(0, 0, w, h);
  const bgPath = asset('leaderboard', 'leaderboard.jpeg');
  if (fs.existsSync(bgPath)) {
    try {
      const bg = await loadImage(bgPath);
      drawCover(ctx, bg, 0, 0, w, h, { anchorY: 1 });
    } catch {
      ctx.fillStyle = '#10151e';
      ctx.fillRect(0, 0, w, h);
    }
  }
  ctx.fillStyle = 'rgba(10, 14, 20, 0.78)';
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#49505b';
  roundRect(ctx, 1, 1, w - 2, h - 2, 26);
  ctx.stroke();

  ctx.fillStyle = muted;
  ctx.font = `bold 13px ${FONT.body}`;
  ctx.fillText('PERINGKAT KOMUNITAS', pad, 38);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 38px ${FONT.display}`;
  ctx.fillText('Leaderboard', pad, 87);
  ctx.textAlign = 'right';
  ctx.fillStyle = amber;
  fitText(ctx, label || 'Poin', w - pad, 78, 380, { size: 26, minSize: 16 });
  ctx.fillStyle = muted;
  ctx.font = `14px ${FONT.body}`;
  ctx.fillText(`${entries.length} anggota ditampilkan`, w - pad, 103);
  ctx.textAlign = 'left';
  ctx.font = `bold 11px ${FONT.body}`;
  ctx.fillText('POSISI', pad + 19, 132);
  ctx.fillText('ANGGOTA', pad + 186, 132);
  ctx.textAlign = 'right';
  ctx.fillText('NILAI', w - pad - 24, 132);
  ctx.textAlign = 'left';

  const images = await Promise.all(entries.map(entry => loadAvatar(entry.avatar, entry.name, 128)));
  let y = headerH;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLeader = entry.rank === 1;
    const panelH = isLeader ? leaderH : rowH;
    const cy = y + panelH / 2;
    const rankColor = RANK_COLORS[entry.rank] || muted;

    roundRect(ctx, pad, y, w - pad * 2, panelH, isLeader ? 16 : 10);
    ctx.fillStyle = isLeader ? '#292219' : '#111923';
    ctx.fill();
    ctx.strokeStyle = isLeader ? '#9a753e' : '#36404d';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = rankColor;
    ctx.textAlign = 'center';
    ctx.font = `bold ${isLeader ? 40 : 27}px ${FONT.display}`;
    ctx.fillText(String(entry.rank).padStart(2, '0'), pad + 47, cy + (isLeader ? 14 : 10), 68);
    ctx.textAlign = 'left';

    const avatarCx = pad + 128;
    const radius = isLeader ? 42 : 27;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    drawCover(ctx, images[i], avatarCx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(avatarCx, cy, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = isLeader ? amber : '#596373';
    ctx.lineWidth = isLeader ? 2 : 1;
    ctx.stroke();

    const nameX = pad + 186;
    if (isLeader) {
      ctx.fillStyle = amber;
      ctx.font = `bold 11px ${FONT.body}`;
      ctx.fillText('PERINGKAT PERTAMA', nameX, cy - 22);
    }
    ctx.fillStyle = '#ffffff';
    fitText(ctx, entry.name || 'Pengguna', nameX, cy + (isLeader ? 14 : 8), 380, {
      size: isLeader ? 30 : 23,
      minSize: 17,
    });

    ctx.textAlign = 'right';
    ctx.fillStyle = isLeader ? amber : '#ffffff';
    fitText(ctx, entry.value ?? '0', w - pad - 24, cy + 2, 294, {
      size: isLeader ? 32 : 25,
      minSize: 15,
    });
    ctx.fillStyle = muted;
    fitText(ctx, label || 'Poin', w - pad - 24, cy + 24, 294, {
      size: 12,
      minSize: 10,
      family: FONT.body,
      weight: 'normal',
    });
    ctx.textAlign = 'left';
    y += panelH + gap;
  }

  if (entries.length === 0) {
    ctx.fillStyle = muted;
    ctx.font = `20px ${FONT.body}`;
    ctx.fillText('Belum ada data peringkat di server ini.', pad, headerH + 50);
  }
  ctx.fillStyle = muted;
  ctx.font = `11px ${FONT.body}`;
  ctx.fillText('EKONOMI & AKTIVITAS SERVER', pad, h - 26);
  ctx.textAlign = 'right';
  ctx.fillText('/leaderboard card', w - pad, h - 26);

  return canvas.toBuffer('image/png');
}

async function renderLeaderboardCard(interaction, kategori) {
  if (interaction.isStringSelectMenu()) {
    try {
      await interaction.deferUpdate();
    } catch {
      return;
    }
  } else {
    await interaction.deferReply();
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
    return send({
      embeds: [baseEmbed().setDescription('Belum ada data di server ini.')],
      components: [seasonControls()],
    });
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
      components: [seasonControls()],
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

  await send({ embeds: [], files: [file], attachments: [], components: [row, seasonControls()] });
}

module.exports = { buildLeaderboardCard, renderLeaderboardCard };
