const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getBossChannel, setBossChannel, clearBossChannel } = require('../../database');
const { themedEmbed, successEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const log = require('../../lib/logger').scope('Admin');

// Channel boss kini dikonfigurasi per-guild (Bugs.md #6), jadi tiap server bisa
// punya mini boss sendiri. Kalau belum di-set, bot memakai BOSS_CHANNEL_ID
// dari .env sebagai fallback.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('boss-channel')
    .setDescription('Atur channel mini boss untuk server ini (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc =>
      sc
        .setName('set')
        .setDescription('Tentukan channel tempat mini boss muncul')
        .addChannelOption(o =>
          o.setName('channel').setDescription('Channel tujuan').setRequired(true),
        ),
    )
    .addSubcommand(sc => sc.setName('show').setDescription('Tampilkan channel boss saat ini'))
    .addSubcommand(sc =>
      sc.setName('clear').setDescription('Hapus konfigurasi; kembali ke BOSS_CHANNEL_ID di .env'),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (subcommand === 'set') {
      const channel = interaction.options.getChannel('channel');
      if (!channel?.isTextBased()) {
        return interaction.reply({
          embeds: [errorEmbed('Pilih channel teks di server ini.')],
          flags: MessageFlags.Ephemeral,
        });
      }
      setBossChannel(guildId, channel.id);
      log.info(`${interaction.user.tag} set channel boss guild ${guildId} -> ${channel.id}`);
      return interaction.reply({
        embeds: [
          successEmbed('Channel Boss Diset', `${e('boss')} Mini boss sekarang muncul di ${channel}.`),
        ],
      });
    }

    if (subcommand === 'show') {
      const channelId = getBossChannel(guildId);
      if (!channelId) {
        return interaction.reply({
          embeds: [
            themedEmbed('boss', 'Channel Boss', COLORS.warn)
              .setDescription(
                `Belum ada konfigurasi per-guild. Pakai \`/boss-channel set\`, atau isi \`BOSS_CHANNEL_ID\` di \`.env\` sebagai fallback.`,
              ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({
        embeds: [
          themedEmbed('boss', 'Channel Boss', COLORS.economy).setDescription(
            `${e('boss')} Mini boss muncul di <#${channelId}>.`,
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // clear
    clearBossChannel(guildId);
    log.info(`${interaction.user.tag} clear channel boss guild ${guildId}`);
    return interaction.reply({
      embeds: [
        successEmbed(
          'Channel Boss Dihapus',
          'Konfigurasi per-guild dihapus. Kalau `BOSS_CHANNEL_ID` diisi di `.env`, itu yang dipakai.',
        ),
      ],
    });
  },
};