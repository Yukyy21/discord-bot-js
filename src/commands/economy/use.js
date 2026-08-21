const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { useItem, addQuestProgress } = require('../../database');
const { describeEffect } = require('../../database/shopCatalog');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { itemEmoji } = require('../../lib/itemEmojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Pakai item dari inventori')
    .addIntegerOption(o => o.setName('id').setDescription('ID item (lihat /inventory)').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const result = useItem(interaction.user.id, interaction.guildId, id);
    if (!result.ok) {
      return interaction.reply({ embeds: [errorEmbed(result.message)], flags: MessageFlags.Ephemeral });
    }

    const info = describeEffect(result.effect);
    addQuestProgress(interaction.user.id, interaction.guildId, 'use_item', 1);
    const embed = themedEmbed(info.emoji, 'Item Digunakan', COLORS.economy)
      .setDescription(`${result.name ? `${itemEmoji(result.name)} ` : ''}${e(info.emoji)} ${result.message}`)
      .setFooter({ text: 'Sisa itemmu bisa dilihat di /inventory' });

    await interaction.reply({ embeds: [embed] });
  },
};
