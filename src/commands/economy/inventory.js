const { SlashCommandBuilder } = require('discord.js');
const { getInventory } = require('../../database');
const { parseEffect, describeEffect } = require('../../database/shopCatalog');
const { themedEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { paginate, pagerRow } = require('../../ui/pager');

/** Dipakai juga oleh handler tombol pagination di interactionCreate.js. */
function buildInventory(user, guildId, page = 0) {
  const items = getInventory(user.id, guildId);
  const { slice, page: current, totalPages, offset } = paginate(items, page);

  const embed = themedEmbed('inventory', `Inventori ${user.displayName ?? user.username}`, COLORS.economy)
    .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 128 }));

  if (!items.length) {
    embed.setDescription(`Masih kosong. Beli item dulu di ${e('shop')} \`/shop\`!`);
    return { embeds: [embed], components: [] };
  }

  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  embed
    .setDescription(`**${items.length}** jenis item • total **${totalQty}** buah\n${DIVIDER}`)
    .addFields(slice.map((i, idx) => {
      // Item dengan efek ditandai supaya user tahu mana yang bisa dipakai lewat /use.
      const info = describeEffect(parseEffect(i.effect));
      const effectLine = info ? `\n${e(info.emoji)} Bisa dipakai: **${info.text}**` : '\nItem koleksi';
      return {
        name: `${e('buy')} ${offset + idx + 1}. ${i.name}`,
        value: `Jumlah: **x${i.quantity}**${effectLine}`,
        inline: false,
      };
    }))
    .setFooter({ text: `Halaman ${current + 1} dari ${totalPages}` });

  return { embeds: [embed], components: pagerRow(`inv_page:${user.id}`, current, totalPages) };
}

module.exports = {
  buildInventory,
  data: new SlashCommandBuilder().setName('inventory').setDescription('Lihat item yang kamu miliki'),
  async execute(interaction) {
    await interaction.reply(buildInventory(interaction.user, interaction.guildId, 0));
  },
};
