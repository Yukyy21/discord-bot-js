const { SlashCommandBuilder } = require('discord.js');
const { themedEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');

const CREDITS = [
  { id: '987011050811580456', role: 'Backend', emoji: 'backend' },
  { id: '1056938161672044544', role: 'Frontend & Backend', emoji: 'frontend' },
  { id: '1056938161672044544', role: 'UI/UX & Aset Emoji', emoji: 'person' },
  { id: '1056938161672044544', role: 'Tester & QA', emoji: 'developer' },
  { id: '987011050811580456', role: 'Tester & QA', emoji: 'developer' },
];

// Ambil unique user ID (biar ga double di bagian "dibangun oleh")
const uniqueIds = [...new Set(CREDITS.map(c => c.id))];

module.exports = {
  CREDITS,
  data: new SlashCommandBuilder().setName('credit').setDescription('Siapa saja yang membangun bot ini'),
  async execute(interaction) {
    const embed = themedEmbed('developer', 'Credit', COLORS.primary)
      .setDescription(
        [
          `${e('person')} Bot ini dibangun oleh ${uniqueIds.map(id => `<@${id}>`).join(' dan ')}`,
          DIVIDER,
        ].join('\n'),
      )
      .addFields(
        CREDITS.map(c => ({
          name: `${e(c.emoji)} ${c.role}`,
          value: `<@${c.id}>`,
          inline: true,
        })),
      )
      .setFooter({ text: 'Terima kasih sudah memakai bot ini' });

    await interaction.reply({ embeds: [embed] });
  },
};
