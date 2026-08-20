const { SlashCommandBuilder } = require('discord.js');
const { getShopStock, getShopTimers, TIER_CONFIG } = require('../../utils/shopRotation');
const { baseEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('shop').setDescription('Lihat item yang tersedia di toko'),
  async execute(interaction) {
    const items = getShopStock();
    const { minutes, seconds } = getShopTimers();

    const tierLines = Object.entries(TIER_CONFIG).map(
      ([tier, cfg]) => `${tier}: ${cfg.weight}%`
    ).join(' | ');

    const embed = baseEmbed()
      .setTitle('🛒 Shop')
      .setColor(0xffd700)
      .setDescription(`Beli dengan \`/buy <id>\`\n\n**Drop Rate:** ${tierLines}\n**Refresh dalam:** ${minutes}m ${seconds}s`)
      .addFields(items.map(i => ({
        name: `${i.id}. ${i.name}`,
        value: `**${i.tier}** — 💰 ${i.price.toLocaleString()} coin`,
        inline: false,
      })));
    await interaction.reply({ embeds: [embed] });
  },
};