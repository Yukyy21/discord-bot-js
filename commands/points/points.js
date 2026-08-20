const { SlashCommandBuilder } = require('discord.js');
const { getPoints } = require('../../db/database');
const { baseEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Cek jumlah poin kamu'),
  async execute(interaction) {
    const user = getPoints(interaction.user.id, interaction.guildId);
    const embed = baseEmbed()
      .setTitle(`⭐ Poin ${interaction.user.username}`)
      .setColor(0xffffff)
      .addFields({ name: 'Total Poin', value: `${user.points.toLocaleString()}` });
    await interaction.reply({ embeds: [embed] });
  },
};