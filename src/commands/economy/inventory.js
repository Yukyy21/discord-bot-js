const { SlashCommandBuilder } = require('discord.js');
const { getInventory } = require('../../database');
const { parseEffect, describeEffect } = require('../../database/shopCatalog');
const { themedEmbed, COLORS } = require('../../ui/embeds');
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
      `**${items.length}** jenis item · total **${totalQty}** buah · terpasang **${equippedCount}**/${EQUIP_SLOTS}`,
    )
    .addFields(
      slice.map((i, idx) => {
        const info = describeEffect(parseEffect(i.effect));
        const tier = getTier(i.price ?? 0, i.name);
        const equipped = i.equipped === 1;

        // Baris 1 (bold, info utama): jumlah + tier. Baris 2: efek kalau ada
        // (kalau tidak, "item koleksi" biasa). Baris 3 (subtext, redup):
        // status equip + command singkat — sengaja diredupkan supaya nama
        // item & efek yang lebih penting tetap paling menonjol.
        const lines = [`${tierMark(tier)} ${tier} · x${i.quantity}`];
        lines.push(info ? `${e(info.emoji)} ${info.text} — \`/use ${i.id}\`` : '-# Item koleksi, tidak ada efek');
        lines.push(
          equipped
            ? `-# ${e('inventory')} Terpasang · \`/equip unequip ${i.id}\` buat lepas`
            : `-# \`/equip equip ${i.id}\``,
        );

        return {
          name: `${offset + idx + 1}. ${itemEmoji(i.name)} ${i.name}${equipped ? ` ${e('inventory')}` : ''}`,
          value: lines.join('\n'),
          inline: false,
        };
      }),
    )
    .setFooter({ text: `Halaman ${current + 1} dari ${totalPages} · equip maks ${EQUIP_SLOTS} item` });

  return { embeds: [embed], components: pagerRow(`inv_page:${user.id}`, current, totalPages) };
}

module.exports = {
  buildInventory,
  data: new SlashCommandBuilder().setName('inventory').setDescription('Lihat item yang kamu miliki'),
  async execute(interaction) {
    await interaction.reply(buildInventory(interaction.user, interaction.guildId, 0));
  },
};
