const { SlashCommandBuilder } = require('discord.js');
const { getInventory } = require('../../database');
const { parseEffect, describeEffect } = require('../../database/shopCatalog');
const { themedEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { itemEmoji, tierMark } = require('../../lib/itemEmojis');
const { getTier } = require('../../lib/tiers');
const { EQUIP_SLOTS } = require('../../config/constants');
const { paginate, pagerRow } = require('../../ui/pager');

/** Dipakai juga oleh handler tombol pagination di interactionCreate.js. */
function buildInventory(user, guildId, page = 0) {
  const items = getInventory(user.id, guildId);
  const { slice, page: current, totalPages, offset } = paginate(items, page);

  const embed = themedEmbed(
    'inventory',
    `Inventori ${user.displayName ?? user.username}`,
    COLORS.economy,
  ).setThumbnail(user.displayAvatarURL({ extension: 'png', size: 128 }));

  if (!items.length) {
    embed.setDescription(`Masih kosong. Beli item dulu di ${e('shop')} \`/shop\`!`);
    return { embeds: [embed], components: [] };
  }

  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  const equippedCount = items.filter(i => i.equipped === 1).length;
  embed
    .setDescription(
      `**${items.length}** jenis item • total **${totalQty}** buah • dipasang **${equippedCount}**/${EQUIP_SLOTS}\n${DIVIDER}`,
    )
    .addFields(
      slice.map((i, idx) => {
        const info = describeEffect(parseEffect(i.effect));
        const tier = getTier(i.price ?? 0, i.name);
        const lines = [`Jumlah **x${i.quantity}** · ${tierMark(tier)} ${tier}`];
        lines.push(
          info
            ? `${e(info.emoji)} Bisa dipakai: **${info.text}** — \`/use ${i.id}\``
            : 'Item koleksi',
        );
        lines.push(
          i.equipped === 1
            ? `${e('inventory')} **Terpasang** di slot equip — \`/equip unequip ${i.id}\``
            : `\`/equip equip ${i.id}\` untuk menandai di slot equip`,
        );
        return {
          name: `${i.equipped === 1 ? e('inventory') : ''} ${itemEmoji(i.name)} ${offset + idx + 1}. ${i.name}`,
          value: lines.join('\n'),
          inline: false,
        };
      }),
    )
    .setFooter({ text: `Halaman ${current + 1} dari ${totalPages} • equip maks ${EQUIP_SLOTS} item` });

  return { embeds: [embed], components: pagerRow(`inv_page:${user.id}`, current, totalPages) };
}

module.exports = {
  buildInventory,
  data: new SlashCommandBuilder().setName('inventory').setDescription('Lihat item yang kamu miliki'),
  async execute(interaction) {
    await interaction.reply(buildInventory(interaction.user, interaction.guildId, 0));
  },
};
