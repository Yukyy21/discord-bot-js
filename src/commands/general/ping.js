const { SlashCommandBuilder } = require('discord.js');
const { themedEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Cek latency bot'),
  async execute(interaction) {
    const ws = interaction.client.ws.ping;
    const status = ws < 0 ? 'menghubungkan' : ws < 150 ? 'lancar' : ws < 400 ? 'agak lag' : 'lag';

    const embed = themedEmbed('ping', 'Pong!', COLORS.info).addFields(
      { name: `${e('clock')} Websocket`, value: `**${ws}ms**`, inline: true },
      { name: `${e('info')} Status`, value: `**${status}**`, inline: true },
    );

    await interaction.reply({ embeds: [embed] });
  },
};
