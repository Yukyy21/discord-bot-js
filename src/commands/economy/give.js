const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, transferCoinsWithFee, addQuestProgress } = require('../../database');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { GIVE_FEE_RATE } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Transfer coin ke user lain')
    .addUserOption(o => o.setName('user').setDescription('Penerima').setRequired(true))
    .addIntegerOption(o =>
      o.setName('amount').setDescription('Jumlah coin').setRequired(true).setMinValue(1),
    ),
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
    const fee = Math.ceil(amount * GIVE_FEE_RATE);
    const totalCost = amount + fee;
    if (sender.balance < totalCost) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            `Saldo tidak cukup. Butuh **${totalCost.toLocaleString()}** ${e('coin')} (**${amount.toLocaleString()}** + biaya **${fee.toLocaleString()}**). Punyamu: **${sender.balance.toLocaleString()}** ${e('coin')}.`,
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    transferCoinsWithFee(senderId, target.id, guildId, amount, fee);
    addQuestProgress(senderId, guildId, 'give', 1);

    const feePercent = Math.round(GIVE_FEE_RATE * 100);

    const embed = themedEmbed('give', 'Transfer Berhasil', COLORS.economy)
      .setDescription(`${interaction.user} ${e('arrow')} ${target}`)
      .addFields(
        { name: `${e('coin')} Jumlah`, value: `**${amount.toLocaleString()}**`, inline: true },
        { name: `${e('coin')} Biaya (${feePercent}%)`, value: `**${fee.toLocaleString()}**`, inline: true },
        {
          name: `${e('bank')} Sisa Saldomu`,
          value: `**${(sender.balance - totalCost).toLocaleString()}**`,
          inline: true,
        },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
