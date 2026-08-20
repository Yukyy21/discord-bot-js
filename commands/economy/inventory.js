const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getInventory } = require('../../db/database');
const { baseEmbed } = require('../../utils/embeds');
const { getItemImageAttachment } = require('../../utils/itemImages');

module.exports = {
  data: new SlashCommandBuilder().setName('inventory').setDescription('Lihat item yang kamu miliki'),
  async execute(interaction) {
    const items = getInventory(interaction.user.id, interaction.guildId);
    const embed = baseEmbed()
      .setTitle(`🎒 Inventori ${interaction.user.username}`);

    if (items.length) {
      const files = [];
      embed.setDescription(items.map(i => {
        const img = getItemImageAttachment(i.itemId);
        if (img) files.push(new AttachmentBuilder(img.filePath, { name: img.attachmentName }));
        return img
          ? `**${i.name}** x${i.quantity} — ${img.attachmentProtocol}`
          : `**${i.name}** x${i.quantity}`;
      }).join('\n'));

      if (files.length > 0) {
        const firstImg = getItemImageAttachment(items[0].itemId);
        if (firstImg) embed.setThumbnail(firstImg.attachmentProtocol);
        await interaction.reply({ embeds: [embed], files });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } else {
      embed.setDescription('Kosong. Beli item di `/shop`!');
      await interaction.reply({ embeds: [embed] });
    }
  },
};