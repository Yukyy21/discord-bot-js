const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getUser, getPoints, updateBalance, setLevel, resetUser } = require('../../database');
const { themedEmbed, errorEmbed, warnEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const log = require('../../lib/logger').scope('Admin');

// Gerbang utama ada di Discord: command ini tidak muncul untuk member tanpa
// izin Administrator. Pemilik server tetap bisa memberikan ke role moderator
// lewat Integrations > Bot > Commands kalau mau.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Perintah khusus admin server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc =>
      sc
        .setName('give-coin')
        .setDescription('Beri coin ke user (untuk event/hadiah)')
        .addUserOption(o => o.setName('user').setDescription('Penerima').setRequired(true))
        .addIntegerOption(o =>
          o.setName('jumlah').setDescription('Jumlah coin').setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand(sc =>
      sc
        .setName('reset-user')
        .setDescription('Hapus semua data user: saldo, Poruv, level, inventori, quest')
        .addUserOption(o => o.setName('user').setDescription('User yang direset').setRequired(true))
        .addBooleanOption(o =>
          o
            .setName('konfirmasi')
            .setDescription('Wajib true supaya reset benar-benar jalan')
            .setRequired(true),
        ),
    )
    .addSubcommand(sc =>
      sc
        .setName('set-level')
        .setDescription('Atur level user secara manual')
        .addUserOption(o => o.setName('user').setDescription('User yang diatur').setRequired(true))
        .addIntegerOption(o =>
          o.setName('level').setDescription('Level baru').setRequired(true).setMinValue(0).setMaxValue(999),
        ),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user');
    const guildId = interaction.guildId;

    if (target.bot) {
      return interaction.reply({
        embeds: [errorEmbed('Bot tidak punya data ekonomi.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === 'give-coin') {
      const amount = interaction.options.getInteger('jumlah');
      updateBalance(target.id, guildId, amount);
      const after = getUser(target.id, guildId);
      log.info(`${interaction.user.tag} beri ${amount} coin ke ${target.tag} di ${guildId}`);

      const embed = themedEmbed('coin', 'Coin Diberikan', COLORS.economy)
        .setDescription(`${e('coin')} **${amount.toLocaleString()}** coin ${e('arrow')} ${target}`)
        .addFields(
          {
            name: `${e('coin')} Saldo Sekarang`,
            value: `**${after.balance.toLocaleString()}**`,
            inline: true,
          },
          { name: `${e('info')} Oleh`, value: `${interaction.user}`, inline: true },
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'reset-user') {
      if (!interaction.options.getBoolean('konfirmasi')) {
        return interaction.reply({
          embeds: [
            warnEmbed('Reset tidak jalan. Ulangi dengan opsi **konfirmasi: true** kalau benar-benar yakin.'),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }
      const wiped = resetUser(target.id, guildId);
      log.info(`${interaction.user.tag} reset data ${target.tag} di ${guildId}: ${JSON.stringify(wiped)}`);

      const embed = themedEmbed('warn', 'Data User Direset', COLORS.warn)
        .setDescription(`${e('success')} Semua data ${target} di guild ini sudah dihapus.`)
        .addFields({
          name: 'Baris terhapus',
          value: [
            `${e('coin')} Saldo/streak: **${wiped.users}**`,
            `${e('point')} Poruv/level: **${wiped.points}**`,
            `${e('inventory')} Item: **${wiped.items}**`,
            `${e('daily')} Quest: **${wiped.quests}**`,
          ].join('\n'),
          inline: false,
        });
      return interaction.reply({ embeds: [embed] });
    }

    // set-level
    const level = interaction.options.getInteger('level');
    const before = getPoints(target.id, guildId);
    setLevel(target.id, guildId, level, 0);
    log.info(`${interaction.user.tag} set level ${target.tag}: ${before.level} -> ${level} di ${guildId}`);

    const embed = themedEmbed('level', 'Level Diatur', COLORS.points)
      .setDescription(`${e('level')} Level ${target} diatur manual.`)
      .addFields(
        { name: 'Sebelum', value: `**${before.level}**`, inline: true },
        { name: 'Sesudah', value: `**${level}**`, inline: true },
        { name: `${e('info')} Catatan`, value: 'XP di-reset ke 0 di level baru.', inline: false },
      );
    return interaction.reply({ embeds: [embed] });
  },
};
