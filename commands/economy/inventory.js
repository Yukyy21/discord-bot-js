const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getInventory } = require('../../db/database');
const { baseEmbed } = require('../../utils/embeds');
const { buildInventoryCard } = require('../../utils/shopCard');

module.exports = {
  data: new SlashCommandBuilder().setName('inventory').setDescription('Lihat item yang kamu miliki'),
  async execute(interaction) {
    try {
      await interaction.deferReply();
    } catch {
      return;
    }

    const items = getInventory(interaction.user.id, interaction.guildId);
    const embed = baseEmbed()
      .setTitle(`🎒 Inventori ${interaction.user.username}`);

    if (!items.length) {
      embed.setDescription('Kosong. Beli item di `/shop`!');
      return interaction.editReply({ embeds: [embed] });
    }

    const buffer = await buildInventoryCard(items);
    const file = new AttachmentBuilder(buffer, { name: 'inventory.png' });
    embed.setDescription(`Kamu memiliki **${items.length}** jenis item.`).setImage('attachment://inventory.png');

    await interaction.editReply({ embeds: [embed], files: [file] });
  },
};
