const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, transferCoins } = require('../../database');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Transfer coin ke user lain')
    .addUserOption(o => o.setName('user').setDescription('Penerima').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Jumlah coin').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const senderId = interaction.user.id;
    const guildId = interaction.guildId;

    if (target.id === senderId) {
      return interaction.reply({
        embeds: [errorEmbed('Tidak bisa transfer ke diri sendiri.')],
        flags: MessageFlags.Ephemeral,
      });
    }
    if (target.bot) {
      return interaction.reply({
        embeds: [errorEmbed('Tidak bisa transfer ke bot.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const sender = getUser(senderId, guildId);
    if (sender.balance < amount) {
      return interaction.reply({
        embeds: [errorEmbed(`Saldo tidak cukup. Punyamu: **${sender.balance.toLocaleString()}** ${e('coin')}.`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    transferCoins(senderId, target.id, guildId, amount);

    const embed = themedEmbed('give', 'Transfer Berhasil', COLORS.economy)
      .setDescription(`${interaction.user} ${e('arrow')} ${target}`)
      .addFields(
        { name: `${e('coin')} Jumlah`, value: `**${amount.toLocaleString()}**`, inline: true },
        { name: `${e('bank')} Sisa Saldomu`, value: `**${(sender.balance - amount).toLocaleString()}**`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
