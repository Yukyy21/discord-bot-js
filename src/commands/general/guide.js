const { SlashCommandBuilder } = require('discord.js');
const { buildGuide } = require('../../ui/guidePages');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guide')
    .setDescription('Lihat panduan lengkap cara pakai bot'),
  async execute(interaction) {
    await interaction.reply(buildGuide('home'));
  },
};
