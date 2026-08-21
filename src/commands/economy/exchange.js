const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, updateBalance, addPoints } = require('../../database');
const { themedEmbed, errorEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { EXCHANGE_RATE: RATE } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exchange')
    .setDescription('Tukar coin jadi poin')
    .addIntegerOption(o => o.setName('amount').setDescription('Jumlah coin yang mau ditukar').setRequired(true).setMinValue(RATE)),
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const coins = Math.floor(amount / RATE) * RATE;
    const points = coins / RATE;

    const user = getUser(interaction.user.id, interaction.guildId);
    if (user.balance < coins) {
      return interaction.reply({
        embeds: [errorEmbed(`Saldo tidak cukup. Butuh **${coins.toLocaleString()}** ${e('coin')} untuk dapat **${points}** ${e('point')}.`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    updateBalance(interaction.user.id, interaction.guildId, -coins);
    addPoints(interaction.user.id, interaction.guildId, points);

    const embed = themedEmbed('exchange', 'Tukar Berhasil', COLORS.economy)
      .setDescription(`**${coins.toLocaleString()}** ${e('coin')} ${e('arrow')} **${points}** ${e('point')}\n${DIVIDER}`)
      .addFields(
        { name: `${e('coin')} Sisa Saldo`, value: `**${(user.balance - coins).toLocaleString()}**`, inline: true },
        { name: `${e('exchange')} Kurs`, value: `${RATE.toLocaleString()} coin = 1 poin`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
