const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { setRating } = require('../../database');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff-rating')
    .setDescription('Beri rating ke staff (1-5 bintang)')
    .addUserOption(o => o.setName('user').setDescription('Staff yang mau dinilai').setRequired(true))
    .addIntegerOption(o =>
      o
        .setName('stars')
        .setDescription('Jumlah bintang 1-5')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5),
    )
    .addStringOption(o => o.setName('comment').setDescription('Komentar singkat (opsional)')),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const stars = interaction.options.getInteger('stars');
    const comment = interaction.options.getString('comment');
    const guildId = interaction.guildId;

    const result = setRating(target.id, interaction.user.id, guildId, stars, comment);
    if (!result.ok) {
      return interaction.reply({ embeds: [errorEmbed(result.message)], flags: MessageFlags.Ephemeral });
    }

    const bar = '⭐'.repeat(stars);
    const embed = themedEmbed('person', 'Rating Dikirim', COLORS.success)
      .setDescription(
        `${e('person')} Kamu memberi **${target.username}** nilai ${stars} ${bar}${comment ? `\n> ${comment}` : ''}.`,
      )
      .setFooter({ text: 'Memberi rating ulang akan memperbarui nilai sebelumnya.' });

    return interaction.reply({ embeds: [embed] });
  },
};