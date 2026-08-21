const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, depositToBank, withdrawFromBank } = require('../../database');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('Simpan atau ambil coin dari bank')
    .addSubcommand(sc => sc.setName('deposit')
      .setDescription('Simpan coin ke bank')
      .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah coin').setRequired(true).setMinValue(1)))
    .addSubcommand(sc => sc.setName('withdraw')
      .setDescription('Ambil coin dari bank')
      .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah coin').setRequired(true).setMinValue(1))),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const amount = interaction.options.getInteger('jumlah');
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const before = getUser(userId, guildId);
    if (subcommand === 'deposit' && before.balance < amount) {
      return interaction.reply({
        embeds: [errorEmbed(`Dompet tidak cukup. Isinya **${before.balance.toLocaleString()}** ${e('coin')}.`)],
        flags: MessageFlags.Ephemeral,
      });
    }
    if (subcommand === 'withdraw' && before.bank < amount) {
      return interaction.reply({
        embeds: [errorEmbed(`Isi bank tidak cukup. Ada **${before.bank.toLocaleString()}** ${e('coin')} di bank.`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === 'deposit') depositToBank(userId, guildId, amount);
    else withdrawFromBank(userId, guildId, amount);

    const after = getUser(userId, guildId);
    const isDeposit = subcommand === 'deposit';
    const embed = themedEmbed('bank', isDeposit ? 'Setoran Berhasil' : 'Penarikan Berhasil', COLORS.economy)
      .setDescription(
        isDeposit
          ? `${e('coin')} **${amount.toLocaleString()}** coin disimpan ke ${e('bank')} bank.`
          : `${e('bank')} **${amount.toLocaleString()}** coin diambil dari bank.`,
      )
      .addFields(
        { name: `${e('coin')} Dompet`, value: `**${after.balance.toLocaleString()}**`, inline: true },
        { name: `${e('bank')} Bank`, value: `**${after.bank.toLocaleString()}**`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
