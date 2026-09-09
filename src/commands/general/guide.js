const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildGuide } = require('../../ui/guidePages');

module.exports = {
  data: new SlashCommandBuilder().setName('guide').setDescription('Lihat panduan lengkap cara pakai bot'),
  async execute(interaction) {
    // Ephemeral: cuma pemanggil yang bisa lihat, biar tidak spam channel.
    await interaction.reply({ ...buildGuide('home'), flags: MessageFlags.Ephemeral });
  },
};
