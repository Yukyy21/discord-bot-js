const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getShopItems, grantItem } = require('../../database');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { itemEmoji } = require('../../lib/itemEmojis');
const log = require('../../lib/logger').scope('GiveItem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('give-item')
    .setDescription('Beri item /shop ke user (untuk event/hadiah)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('user').setDescription('Penerima').setRequired(true))
    .addIntegerOption(o =>
      o.setName('id').setDescription('ID item (lihat /shop)').setRequired(true).setMinValue(1),
    )
    .addIntegerOption(o =>
      o.setName('jumlah').setDescription('Jumlah item (default 1)').setRequired(false).setMinValue(1),
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const itemId = interaction.options.getInteger('id');
    const qty = interaction.options.getInteger('jumlah') ?? 1;
    const guildId = interaction.guildId;

    if (target.bot) {
      return interaction.reply({ embeds: [errorEmbed('Bot tidak punya inventori.')], flags: MessageFlags.Ephemeral });
    }

    const item = getShopItems().find(i => i.id === itemId);
    if (!item) {
      return interaction.reply({
        embeds: [errorEmbed('Item tidak ditemukan. Cek `/shop` untuk daftar ID item.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    grantItem(target.id, guildId, itemId, qty);
    log.info(`${interaction.user.tag} beri ${qty}x "${item.name}" ke ${target.tag} di ${guildId}`);

    const embed = themedEmbed('inventory', 'Item Diberikan', COLORS.economy).setDescription(
      `${itemEmoji(item.name)} **${qty}x ${item.name}** ${e('arrow')} ${target}`,
    );
    return interaction.reply({ embeds: [embed] });
  },
};
    
