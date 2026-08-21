const { SlashCommandBuilder } = require('discord.js');
const { getShopStock, getShopTimers, TIER_CONFIG } = require('../../lib/shopRotation');
const { parseEffect, describeEffect } = require('../../database/shopCatalog');
const { themedEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { paginate, pagerRow } = require('../../ui/pager');

/**
 * Saring stok berdasarkan tier dan/atau potongan nama (tidak peduli huruf
 * besar-kecil). Fungsi murni supaya gampang dites tanpa Discord.
 */
function filterStock(items, { tier = '', query = '' } = {}) {
  const q = query.trim().toLowerCase();
  return items.filter(i =>
    (!tier || i.tier === tier) && (!q || i.name.toLowerCase().includes(q)));
}

/** Rapikan input pencarian: tanpa ':' (pemisah customId) dan maksimal 40 karakter. */
function sanitizeQuery(query = '') {
  return String(query).replace(/:/g, ' ').trim().slice(0, 40);
}

/**
 * Dipakai juga oleh handler tombol pagination di interactionCreate.js.
 * Filter masuk customId (`shop_page:<tier>:<kata kunci>:<halaman>`), jadi
 * tombol tetap jalan walau bot restart.
 */
function buildShop(page = 0, filter = {}) {
  const tier = filter.tier || '';
  const query = sanitizeQuery(filter.query);
  const items = filterStock(getShopStock(), { tier, query });
  const { minutes, seconds } = getShopTimers();
  const { slice, page: current, totalPages } = paginate(items, page);

  const tierLines = Object.entries(TIER_CONFIG)
    .map(([t, cfg]) => `${t} \`${cfg.weight}%\``)
    .join(' • ');

  const filterBits = [];
  if (tier) filterBits.push(`tier **${tier}**`);
  if (query) filterBits.push(`nama mengandung **"${query}"**`);

  const description = [
    `Beli pakai ${e('buy')} \`/buy <id>\``,
    `${e('clock')} Refresh dalam **${minutes}m ${seconds}s**`,
    DIVIDER,
    `**Drop rate:** ${tierLines}`,
  ];
  if (filterBits.length) {
    description.push(DIVIDER, `${e('info')} Filter aktif: ${filterBits.join(' • ')} — **${items.length}** item cocok`);
  }

  const embed = themedEmbed('shop', 'Toko', COLORS.economy)
    .setDescription(description.join('\n'))
    .addFields(slice.map(i => {
      const info = describeEffect(parseEffect(i.effect));
      const effectLine = info ? `\n${e(info.emoji)} ${info.text}` : '';
      return {
        name: `${e('buy')} [${i.id}] ${i.name}`,
        value: `${i.tier} • **${i.price.toLocaleString()}** ${e('coin')}${effectLine}`,
        inline: false,
      };
    }))
    .setFooter({ text: `Halaman ${current + 1} dari ${totalPages} • ${items.length} item tersedia` });

  if (!items.length) {
    embed.addFields({
      name: 'Kosong',
      value: filterBits.length
        ? 'Tidak ada item yang cocok dengan filter. Coba kata kunci lain.'
        : 'Stok sedang di-refresh, coba sebentar lagi.',
    });
  }

  // Prefix membawa state filter agar tombol halaman mempertahankannya.
  return { embeds: [embed], components: pagerRow(`shop_page:${tier}:${query}`, current, totalPages) };
}

module.exports = {
  buildShop,
  filterStock,
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Lihat item yang tersedia di toko')
    .addStringOption(o => o.setName('tier')
      .setDescription('Saring berdasarkan tier item')
      .addChoices(...Object.keys(TIER_CONFIG).map(t => ({ name: t, value: t }))))
    .addStringOption(o => o.setName('cari')
      .setDescription('Cari item berdasarkan nama')
      .setMaxLength(40)),
  async execute(interaction) {
    await interaction.reply(buildShop(0, {
      tier: interaction.options.getString('tier') || '',
      query: interaction.options.getString('cari') || '',
    }));
  },
};
