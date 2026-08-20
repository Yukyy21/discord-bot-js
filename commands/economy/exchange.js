const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, updateBalance, addPoints } = require('../../db/database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

const RATE = 500;

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
        embeds: [errorEmbed(`Saldo tidak cukup. Butuh **${coins.toLocaleString()} coin** untuk dapat **${points} poin**.`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    updateBalance(interaction.user.id, interaction.guildId, -coins);
    addPoints(interaction.user.id, interaction.guildId, points);

    const embed = successEmbed(
      '✅ Exchange Berhasil',
      `**${coins.toLocaleString()} coin** → **${points} poin**\nSisa saldo: **${(user.balance - coins).toLocaleString()} coin**`
    );
    await interaction.reply({ embeds: [embed] });
  },
};
