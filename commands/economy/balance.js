const { SlashCommandBuilder } = require('discord.js');
const { getUser } = require('../../db/database');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Cek saldo kamu (dompet & bank)'),
  async execute(interaction) {
    const user = getUser(interaction.user.id, interaction.guildId);
    const embed = successEmbed('💰 Saldo', 'Saldo akun kamu saat ini')
      .addFields(
        { name: 'Dompet', value: `${user.balance.toLocaleString()} coin`, inline: true },
        { name: 'Bank', value: `${user.bank.toLocaleString()} coin`, inline: true },
      );
    await interaction.reply({ embeds: [embed] });
  },
};