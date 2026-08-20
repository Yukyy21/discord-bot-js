const { MessageFlags } = require('discord.js');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // Skip interaksi yang sudah expired (>2.5 detik) — terjadi saat bot baru restart
    if (Date.now() - interaction.createdTimestamp > 2500) return;

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'lb_filter') {
        const { renderLeaderboardCard } = require('../utils/leaderboardCard');
        try {
          await renderLeaderboardCard(interaction, interaction.values[0]);
        } catch (error) {
          console.error('Error pada select menu lb_filter:', error);
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      // 10062 = interaction expired — tidak perlu coba reply lagi
      if (error.code === 10062) return;
      try {
        const errorReply = { embeds: [errorEmbed('Terjadi error saat menjalankan command ini.')], flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorReply);
        } else {
          await interaction.reply(errorReply);
        }
      } catch (replyError) {
        console.error('Gagal mengirim pesan error:', replyError);
      }
    }
  },
};