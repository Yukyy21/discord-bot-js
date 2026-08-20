const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Cek latency bot'),
  async execute(interaction) {
    const embed = baseEmbed()
      .setTitle('🏓 Pong!')
      .setDescription(`Latency: **${interaction.client.ws.ping}ms**`);
    await interaction.reply({ embeds: [embed] });
  },
};