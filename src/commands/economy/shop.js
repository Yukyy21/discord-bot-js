const { SlashCommandBuilder } = require('discord.js');
const { getShopStock, getShopTimers, TIER_CONFIG } = require('../../lib/shopRotation');
const { themedEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { paginate, pagerRow } = require('../../ui/pager');

/** Dipakai juga oleh handler tombol pagination di interactionCreate.js. */
function buildShop(page = 0) {
  const items = getShopStock();
  const { minutes, seconds } = getShopTimers();
  const { slice, page: current, totalPages, offset } = paginate(items, page);

  const tierLines = Object.entries(TIER_CONFIG)
    .map(([tier, cfg]) => `${tier} \`${cfg.weight}%\``)
    .join(' • ');

  const embed = themedEmbed('shop', 'Toko', COLORS.economy)
    .setDescription([
      `Beli pakai ${e('buy')} \`/buy <id>\``,
      `${e('clock')} Refresh dalam **${minutes}m ${seconds}s**`,
      DIVIDER,
      `**Drop rate:** ${tierLines}`,
    ].join('\n'))
    .addFields(slice.map(i => ({
      name: `${e('buy')} [${i.id}] ${i.name}`,
      value: `${i.tier} • **${i.price.toLocaleString()}** ${e('coin')}`,
      inline: false,
    })))
    .setFooter({ text: `Halaman ${current + 1} dari ${totalPages} • ${items.length} item tersedia` });

  if (!items.length) embed.addFields({ name: 'Kosong', value: 'Stok sedang di-refresh, coba sebentar lagi.' });

  return { embeds: [embed], components: pagerRow('shop_page', current, totalPages) };
}

module.exports = {
  buildShop,
  data: new SlashCommandBuilder().setName('shop').setDescription('Lihat item yang tersedia di toko'),
  async execute(interaction) {
    await interaction.reply(buildShop(0));
  },
};
