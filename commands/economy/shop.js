const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getShopStock, getShopTimers, TIER_CONFIG } = require('../../utils/shopRotation');
const { baseEmbed } = require('../../utils/embeds');
const { getItemImageAttachment } = require('../../utils/itemImages');

module.exports = {
  data: new SlashCommandBuilder().setName('shop').setDescription('Lihat item yang tersedia di toko'),
  async execute(interaction) {
    const items = getShopStock();
    const { minutes, seconds } = getShopTimers();

    const tierLines = Object.entries(TIER_CONFIG).map(
      ([tier, cfg]) => `${tier}: ${cfg.weight}%`
    ).join(' | ');

    const files = [];
    const fields = items.map(i => {
      const img = getItemImageAttachment(i.id);
      if (img) files.push(new AttachmentBuilder(img.filePath, { name: img.attachmentName }));
      return {
        name: `${i.id}. ${i.name}`,
        value: `**${i.tier}** — 💰 ${i.price.toLocaleString()} coin`,
        inline: false,
      };
    });

    const embed = baseEmbed()
      .setTitle('🛒 Shop')
      .setColor(0xffd700)
      .setDescription(`Beli dengan \`/buy <id>\`\n\n**Drop Rate:** ${tierLines}\n**Refresh dalam:** ${minutes}m ${seconds}s`)
      .addFields(fields);

    if (files.length > 0) {
      const firstImg = getItemImageAttachment(items[0].id);
      if (firstImg) embed.setThumbnail(firstImg.attachmentProtocol);
    }

    await interaction.reply({ embeds: [embed], files });
  },
};