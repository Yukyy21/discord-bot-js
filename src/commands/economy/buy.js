const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buyItem, addQuestProgress } = require('../../database');
const { getShopItemById } = require('../../lib/shopRotation');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { itemEmoji, tierMark } = require('../../lib/itemEmojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Beli item dari toko')
    .addIntegerOption(o => o.setName('id').setDescription('ID item (lihat /shop)').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const stock = getShopItemById(id);
    if (!stock) {
      return interaction.reply({
        embeds: [errorEmbed(`Item ini tidak ada di shop saat ini. Cek ${e('shop')} \`/shop\` untuk lihat stok.`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    const result = buyItem(interaction.user.id, interaction.guildId, id);
    if (!result.ok) {
      return interaction.reply({ embeds: [errorEmbed(result.message)], flags: MessageFlags.Ephemeral });
    }
    addQuestProgress(interaction.user.id, interaction.guildId, 'buy_item', 1);

    const embed = themedEmbed('buy', 'Pembelian Berhasil', COLORS.economy)
      .setDescription(`${itemEmoji(stock.name)} ${tierMark(stock.tier)} **${stock.name}**\n${result.message}`)
      .setFooter({ text: 'Lihat barangmu di /inventory' });

    await interaction.reply({ embeds: [embed] });
  },
};
