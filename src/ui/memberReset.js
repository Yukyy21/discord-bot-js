const { randomUUID } = require('node:crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const { resetGuildMemberData } = require('../events/voiceStateUpdate');
const { baseEmbed } = require('./embeds');
const logger = require('../lib/logger');

const confirmations = new Map();
const CONFIRM_MS = 60000;
const message = description => baseEmbed().setColor(0xffbe55).setDescription(description);

async function handleMemberReset(interaction) {
  const [action, token] = interaction.customId.split(':');
  const deny = text => interaction.reply({ embeds: [message(text)], flags: MessageFlags.Ephemeral });
  if (!interaction.guildId) return deny('Reset Total hanya tersedia di server.');
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return deny('Hanya Administrator yang dapat melakukan Reset Total.');
  }
  const now = Date.now();
  for (const [key, value] of confirmations) {
    if (value.expiresAt <= now) confirmations.delete(key);
  }
  if (action === 'members_reset') {
    const id = randomUUID();
    confirmations.set(id, {
      guildId: interaction.guildId,
      userId: interaction.user.id,
      expiresAt: now + CONFIRM_MS,
    });
    return interaction.reply({
      embeds: [
        message(
          '**RESET TOTAL: hapus permanen seluruh data anggota di server ini saja?**\n\n**Dihapus:** dompet, bank, streak/klaim harian, poin, XP, level, jam voice, inventory, quest, buff pribadi, poin mingguan, pemakaian give/kode redeem, klaim Poruv Shop, pengingat beta, kontribusi boss, serta keanggotaan staff, rating dan aktivitas staff.\n**Disimpan:** arsip season, pengaturan server/divisi staff, katalog toko/kode redeem beserta batas pemakaiannya, buff server, konfigurasi/spawn boss, statistik global dan server lain. Tidak membuat arsip season baru.\n\nSesi voice aktif dihitung ulang dari saat reset. Hanya admin pemrakarsa dapat mengonfirmasi dalam 60 detik. **Tidak dapat dibatalkan setelah dikonfirmasi.**',
        ),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`members_confirm:${id}`)
            .setLabel('Hapus Semua Data Anggota')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`members_cancel:${id}`)
            .setLabel('Batal')
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (!['members_confirm', 'members_cancel'].includes(action)) return;
  const pending = confirmations.get(token);
  const valid = () =>
    confirmations.get(token) === pending &&
    pending &&
    pending.expiresAt > Date.now() &&
    pending.guildId === interaction.guildId &&
    pending.userId === interaction.user.id;
  if (!valid()) return deny('Konfirmasi tidak valid atau sudah kedaluwarsa. Buka Reset Total lagi.');
  if (action === 'members_cancel') {
    confirmations.delete(token);
    return interaction.update({
      embeds: [message('Reset Total dibatalkan. Data tidak diubah.')],
      components: [],
    });
  }
  await interaction.deferUpdate();
  if (!valid()) {
    return interaction.editReply({
      embeds: [message('Konfirmasi kedaluwarsa atau sudah digunakan.')],
      components: [],
    });
  }
  confirmations.delete(token);
  try {
    const result = resetGuildMemberData(interaction.guildId, Date.now());
    for (const [key, value] of confirmations) {
      if (value.guildId === interaction.guildId) confirmations.delete(key);
    }
    logger.info(
      `Member reset guild=${interaction.guildId} actor=${interaction.user.id} users=${result.users}`,
    );
    return interaction.editReply({
      embeds: [
        message(
          'Reset Total selesai untuk server ini. Arsip season dan pengaturan tetap disimpan. Jalankan ulang /leaderboard card untuk memperbarui gambar.',
        ),
      ],
      components: [],
    });
  } catch (error) {
    logger.error('Reset Total gagal:', error);
    return interaction.editReply({
      embeds: [message('Reset Total gagal. Periksa log bot sebelum mencoba lagi.')],
      components: [],
    });
  }
}

module.exports = { handleMemberReset };
