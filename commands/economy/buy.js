const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { buyItem } = require('../../db/database');
const { getShopItemById } = require('../../utils/shopRotation');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { getItemImageAttachment } = require('../../utils/itemImages');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Beli item dari toko')
    .addIntegerOption(o => o.setName('id').setDescription('ID item (lihat /shop)').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const stock = getShopItemById(id);
    if (!stock) {
      return interaction.reply({ embeds: [errorEmbed('Item ini tidak ada di shop saat ini. Cek `/shop` untuk lihat stok.')], flags: MessageFlags.Ephemeral });
    }
    const result = buyItem(interaction.user.id, interaction.guildId, id);

    if (!result.ok) {
      return interaction.reply({ embeds: [errorEmbed(result.message)], flags: MessageFlags.Ephemeral });
    }

    const embed = successEmbed('✅ Pembelian Berhasil', result.message);
    const files = [];
    const img = getItemImageAttachment(id);
    if (img) {
      files.push(new AttachmentBuilder(img.filePath, { name: img.attachmentName }));
      embed.setImage(img.attachmentProtocol);
    }

    await interaction.reply({ embeds: [embed], files });
  },
};