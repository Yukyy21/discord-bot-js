const { SlashCommandBuilder } = require('discord.js');
const { getInventory } = require('../../db/database');
const { baseEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('inventory').setDescription('Lihat item yang kamu miliki'),
  async execute(interaction) {
    const items = getInventory(interaction.user.id, interaction.guildId);
    const embed = baseEmbed()
      .setTitle(`🎒 Inventori ${interaction.user.username}`)
      .setDescription(items.length
        ? items.map(i => `**${i.name}** x${i.quantity}`).join('\n')
        : 'Kosong. Beli item di `/shop`!');
    await interaction.reply({ embeds: [embed] });
  },
};