const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { getShopStock, getShopTimers, TIER_CONFIG } = require('../../utils/shopRotation');
const { baseEmbed } = require('../../utils/embeds');
const { buildShopCard } = require('../../utils/shopCard');

module.exports = {
  data: new SlashCommandBuilder().setName('shop').setDescription('Lihat item yang tersedia di toko'),
  async execute(interaction) {
    try {
      await interaction.deferReply();
    } catch {
      return;
    }

    const items = getShopStock();
    const { minutes, seconds } = getShopTimers();

    const tierLines = Object.entries(TIER_CONFIG).map(
      ([tier, cfg]) => `${tier}: ${cfg.weight}%`
    ).join(' | ');

    const buffer = await buildShopCard(items);
    const file = new AttachmentBuilder(buffer, { name: 'shop.png' });

    const embed = baseEmbed()
      .setTitle('🛒 Shop')
      .setColor(0xffd700)
      .setDescription(`Beli dengan \`/buy <id>\`\n\n**Drop Rate:** ${tierLines}\n**Refresh dalam:** ${minutes}m ${seconds}s`)
      .setImage('attachment://shop.png');

    await interaction.editReply({ embeds: [embed], files: [file] });
  },
};
