// Helper pagination untuk /shop, /inventory, /leaderboard.
// State disimpan di customId ("prefix:extra:page"), jadi tidak butuh cache
// dan tetap jalan walau bot restart.
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { eo } = require('../lib/emojis');

const PAGE_SIZE = 5;

function paginate(items, page, size = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(page, 0), totalPages - 1);
  return {
    slice: items.slice(current * size, current * size + size),
    page: current,
    totalPages,
    offset: current * size,
  };
}

/**
 * Baris tombol navigasi. `prefix` contoh: 'shop_page' atau 'lb_page:points'.
 * Hasil customId: `${prefix}:${page}`.
 */
function pagerRow(prefix, page, totalPages) {
  if (totalPages <= 1) return [];
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}:${page - 1}`)
      .setLabel('Sebelumnya')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(eo('back'))
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId('pager_noop')
      .setLabel(`Halaman ${page + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`${prefix}:${page + 1}`)
      .setLabel('Berikutnya')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(eo('next'))
      .setDisabled(page >= totalPages - 1),
  );
  return [row];
}

module.exports = { PAGE_SIZE, paginate, pagerRow };
