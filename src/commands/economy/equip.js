const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { setEquipped, getEquipCount, getInventory } = require('../../database');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { itemEmoji } = require('../../lib/itemEmojis');
const { EQUIP_SLOTS } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('equip')
    .setDescription('Pasang atau lepas item ke slot equip (maks 5)')
    .addSubcommand(sc =>
      sc
        .setName('equip')
        .setDescription('Pasang item ke slot equip')
        .addIntegerOption(o =>
          o.setName('id').setDescription('ID item (lihat /inventory)').setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand(sc =>
      sc
        .setName('unequip')
        .setDescription('Lepas item dari slot equip')
        .addIntegerOption(o =>
          o.setName('id').setDescription('ID item (lihat /inventory)').setRequired(true).setMinValue(1),
        ),
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const id = interaction.options.getInteger('id');
    const equipped = sub === 'equip';
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    const owned = getInventory(userId, guildId).find(i => i.id === id);
    if (!owned) {
      return interaction.reply({
        embeds: [errorEmbed('Kamu tidak punya item itu.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const result = setEquipped(userId, guildId, id, equipped);
    if (!result.ok) {
      return interaction.reply({ embeds: [errorEmbed(result.message)], flags: MessageFlags.Ephemeral });
    }

    const count = getEquipCount(userId, guildId);
    const action = equipped ? 'dipasang ke slot equip' : 'dilepas dari slot equip';
    const embed = themedEmbed(
      'inventory',
      equipped ? 'Item Dipasang' : 'Item Dilepas',
      COLORS.economy,
    )
      .setDescription(`${itemEmoji(owned.name)} **${owned.name}** ${action}.`)
      .addFields({
        name: `${e('inventory')} Slot terpakai`,
        value: `**${count}** / **${EQUIP_SLOTS}**`,
        inline: true,
      })
      .setFooter({
        text: 'Equip hanya penanda build — efek item tetap aktif lewat /use.',
      });

    await interaction.reply({ embeds: [embed] });
  },
};