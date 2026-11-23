const { randomUUID } = require('node:crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} = require('discord.js');
const { resetSeason, getSeasonHistory, getSeasonStandings } = require('../database');
const { resetSeasonVoiceSessions } = require('../events/voiceStateUpdate');
const { baseEmbed } = require('./embeds');
const logger = require('../lib/logger');

const confirmations = new Map();
const CONFIRM_MS = 60000;

function seasonControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('season_history')
      .setLabel('Arsip Season')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('season_reset')
      .setLabel('Reset Season (Admin)')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('members_reset')
      .setLabel('Reset Total (Admin)')
      .setStyle(ButtonStyle.Danger),
  );
}

function message(description) {
  return baseEmbed().setColor(0xffbe55).setDescription(description);
}

async function handleSeasonButton(interaction) {
  const [action, token] = interaction.customId.split(':');
  if (!interaction.guildId) {
    return interaction.reply({
      embeds: [message('Fitur season hanya tersedia di server.')],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (action === 'season_history') {
    const history = getSeasonHistory(interaction.guildId, 10);
    if (!history.length) {
      return interaction.reply({
        embeds: [message('Belum ada season yang diarsipkan.')],
        flags: MessageFlags.Ephemeral,
      });
    }
    const select = new StringSelectMenuBuilder()
      .setCustomId('season_archive')
      .setPlaceholder('Pilih arsip season')
      .addOptions(
        history.map(season => ({
          label: `Season ${season.seasonNumber}`,
          value: String(season.seasonNumber),
        })),
      );
    return interaction.reply({
      embeds: [message('Pilih season untuk melihat hasil akhirnya.')],
      components: [new ActionRowBuilder().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      embeds: [message('Hanya Administrator yang dapat mereset season.')],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (action === 'season_reset') {
    const now = Date.now();
    for (const [key, value] of confirmations) {
      if (value.expiresAt <= now) confirmations.delete(key);
    }
    const history = getSeasonHistory(interaction.guildId, 1);
    const id = randomUUID();
    confirmations.set(id, {
      guildId: interaction.guildId,
      userId: interaction.user.id,
      expiresAt: now + CONFIRM_MS,
      previousSeason: history[0]?.seasonNumber || 0,
    });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`season_confirm:${id}`)
        .setLabel('Arsipkan & Mulai Season Baru')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`season_cancel:${id}`)
        .setLabel('Batal')
        .setStyle(ButtonStyle.Secondary),
    );
    return interaction.reply({
      embeds: [
        message(
          'Reset seluruh anggota di server ini?\n\n**Diarsipkan lalu direset:** poin, coin dompet, bank, jam voice, dan poin mingguan.\n**Tetap disimpan:** XP, level/rank, inventory, dan streak.\n\nSesi voice aktif mulai dihitung dari waktu reset. Konfirmasi berlaku 60 detik. Reset tidak dapat dibatalkan.',
        ),
      ],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }
  const pending = confirmations.get(token);
  if (
    !pending ||
    pending.expiresAt <= Date.now() ||
    pending.guildId !== interaction.guildId ||
    pending.userId !== interaction.user.id
  ) {
    return interaction.reply({
      embeds: [message('Konfirmasi tidak valid atau sudah kedaluwarsa. Buka Reset Season lagi.')],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (action === 'season_cancel') {
    confirmations.delete(token);
    return interaction.update({
      embeds: [message('Reset season dibatalkan. Data tidak diubah.')],
      components: [],
    });
  }
  if (action !== 'season_confirm') return;
  await interaction.deferUpdate();
  if (confirmations.get(token) !== pending) {
    return interaction.editReply({ embeds: [message('Konfirmasi ini sudah digunakan.')], components: [] });
  }
  confirmations.delete(token);
  const history = getSeasonHistory(interaction.guildId, 1);
  if ((history[0]?.seasonNumber || 0) !== pending.previousSeason) {
    return interaction.editReply({
      embeds: [message('Season sudah direset oleh admin lain. Data tidak diubah lagi.')],
      components: [],
    });
  }
  try {
    const now = Date.now();
    const result = resetSeason(interaction.guildId, interaction.user.id, now);
    resetSeasonVoiceSessions(interaction.guildId, now);
    logger.info(
      `Season ${result.seasonNumber} archived guild=${interaction.guildId} actor=${interaction.user.id} users=${result.userCount}`,
    );
    return interaction.editReply({
      embeds: [
        message(
          `Season ${result.seasonNumber} telah diarsipkan (${result.userCount} anggota). **Season ${result.seasonNumber + 1} dimulai.**\nPoin, dompet, bank, jam voice, dan poin mingguan sudah 0. Jalankan ulang /leaderboard card untuk memperbarui gambar.`,
        ),
      ],
      components: [],
    });
  } catch (error) {
    logger.error('Reset season gagal:', error);
    return interaction.editReply({
      embeds: [message('Reset season gagal. Periksa log bot sebelum mencoba lagi.')],
      components: [],
    });
  }
}

async function handleSeasonArchive(interaction) {
  await interaction.deferUpdate();
  const seasonNumber = Number(interaction.values[0]);
  if (!Number.isSafeInteger(seasonNumber) || seasonNumber < 1 || !interaction.guildId) return;
  const fields = [
    ['Poin', 'points'],
    ['Dompet', 'balance'],
    ['Bank', 'bank'],
    ['Jam Voice', 'voice'],
    ['Poin Mingguan', 'weekly'],
  ].map(([name, category]) => {
    const rows = getSeasonStandings(interaction.guildId, seasonNumber, category, 5);
    const value =
      rows
        .map((row, index) => {
          const score =
            category === 'voice' ? `${(row.value / 3600).toFixed(1)} jam` : row.value.toLocaleString('id-ID');
          return `${index + 1}. <@${row.userId}>: **${score}**`;
        })
        .join('\n') || 'Tidak ada data.';
    return { name, value };
  });
  return interaction.editReply({
    embeds: [
      message('Hasil akhir, 5 besar per kategori. Saldo ini adalah arsip, bukan saldo aktif.')
        .setTitle(`Arsip Season ${seasonNumber}`)
        .addFields(fields),
    ],
    allowedMentions: { parse: [] },
  });
}

module.exports = { seasonControls, handleSeasonButton, handleSeasonArchive };
