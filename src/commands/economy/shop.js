const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getShopStock, getShopTimers, getShopRefreshAt, TIER_CONFIG } = require('../../lib/shopRotation');
const { parseEffect, describeEffect } = require('../../database/shopCatalog');
const { getUser } = require('../../database');
const { themedEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { itemEmoji } = require('../../lib/itemEmojis');
const { paginate, pagerRow } = require('../../ui/pager');

const TIER_ORDER = Object.keys(TIER_CONFIG);

/** Saring stok berdasarkan tier dan/atau potongan nama. Fungsi murni. */
function filterStock(items, { tier = '', query = '' } = {}) {
  const q = query.trim().toLowerCase();
  return items.filter(i =>
    (!tier || i.tier === tier) && (!q || i.name.toLowerCase().includes(q)));
}

/** Urutkan dari tier tertinggi lalu harga termahal supaya etalase enak dibaca. */
function sortStock(items) {
  return [...items].sort((a, b) => {
    const d = TIER_ORDER.indexOf(b.tier) - TIER_ORDER.indexOf(a.tier);
    return d !== 0 ? d : b.price - a.price;
  });
}

/** Rapikan input pencarian: tanpa ':' (pemisah customId) dan maksimal 40 karakter. */
function sanitizeQuery(query = '') {
  return String(query).replace(/:/g, ' ').trim().slice(0, 40);
}

function hexToInt(hex) {
  return parseInt(String(hex).replace('#', ''), 16);
}

function tierSelectRow(tier, query) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`shop_tier:${query}`)
    .setPlaceholder(tier ? `Tier: ${tier}` : 'Saring berdasarkan tier')
    .addOptions(
      { label: 'Semua tier', value: 'all', emoji: { name: '🗂️' }, default: !tier },
      ...TIER_ORDER.map(t => ({
        label: t,
        value: t,
        description: `Drop rate ${TIER_CONFIG[t].weight}%`,
        default: tier === t,
      })),
    );
  return new ActionRowBuilder().addComponents(menu);
}

/** Tanda beli-able saja; item yang belum terbeli dibiarkan polos. */
function affordability(price, balance) {
  if (balance === null || balance < price) return '';
  return ` ${e('success')}`;
}

/**
 * Dipakai juga oleh handler tombol/select di interactionCreate.js.
 * Filter masuk customId (`shop_page:<tier>:<kata kunci>:<halaman>`), jadi
 * tombol tetap jalan walau bot restart.
 */
function buildShop(page = 0, filter = {}, viewer = null) {
  const tier = TIER_ORDER.includes(filter.tier) ? filter.tier : '';
  const query = sanitizeQuery(filter.query);
  const items = sortStock(filterStock(getShopStock(), { tier, query }));
  const { minutes, seconds } = getShopTimers();
  const { slice, page: current, totalPages } = paginate(items, page);

  let balance = null;
  if (viewer?.userId && viewer?.guildId) {
    try {
      balance = getUser(viewer.userId, viewer.guildId).balance;
    } catch {
      balance = null;
    }
  }

  const header = [
    `${e('clock')} Refresh <t:${Math.floor(getShopRefreshAt() / 1000)}:R> · \`${minutes}m ${seconds}s\``,
  ];
  if (balance !== null) header.push(`${e('coin')} Saldo **${balance.toLocaleString()}**`);

  const filterBits = [];
  if (tier) filterBits.push(`tier **${tier}**`);
  if (query) filterBits.push(`cari **"${query}"**`);

  const embed = themedEmbed('shop', 'Toko Petualang', tier ? hexToInt(TIER_CONFIG[tier].color) : COLORS.economy);

  const lines = [header.join(' · ')];
  if (filterBits.length) lines.push(`${filterBits.join(' · ')} — **${items.length}** item`);
  lines.push(DIVIDER);

  if (!items.length) {
    lines.push(filterBits.length
      ? `${e('warn')} Tidak ada item yang cocok dengan filter.`
      : `${e('warn')} Stok sedang di-refresh, coba sebentar lagi.`);
  } else {
    for (const i of slice) {
      const info = describeEffect(parseEffect(i.effect));
      lines.push(
        `${itemEmoji(i.name)} **${i.name}** · \`ID ${i.id}\`\n` +
        `-# ${i.price.toLocaleString()} coin${affordability(i.price, balance)} · ${i.tier}` +
        `${info ? ` · ${info.text}` : ''}`,
      );
    }
    lines.push(DIVIDER, `-# Beli dengan \`/buy <id>\``);
  }

  embed.setDescription(lines.join('\n'));

  embed.setFooter({ text: `Halaman ${current + 1}/${totalPages} • ${items.length} item di etalase` });

  return {
    embeds: [embed],
    components: [
      tierSelectRow(tier, query),
      ...pagerRow(`shop_page:${tier}:${query}`, current, totalPages),
    ],
  };
}

module.exports = {
  buildShop,
  filterStock,
  sortStock,
  sanitizeQuery,
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Lihat item yang tersedia di toko')
    .addStringOption(o => o.setName('tier')
      .setDescription('Saring berdasarkan tier item')
      .addChoices(...TIER_ORDER.map(t => ({ name: t, value: t }))))
    .addStringOption(o => o.setName('cari')
      .setDescription('Cari item berdasarkan nama')
      .setMaxLength(40)),
  async execute(interaction) {
    await interaction.deferReply();
    await interaction.editReply(buildShop(
      0,
      {
        tier: interaction.options.getString('tier') || '',
        query: interaction.options.getString('cari') || '',
      },
      { userId: interaction.user.id, guildId: interaction.guildId },
    ));
  },
};
