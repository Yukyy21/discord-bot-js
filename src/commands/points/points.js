const { SlashCommandBuilder } = require('discord.js');
const { getPoints } = require('../../database');
const { themedEmbed, COLORS, DIVIDER, progressLine } = require('../../ui/embeds');
const { e, tierEmoji } = require('../../lib/emojis');
const { getRank } = require('../../lib/ranks');
const { xpForLevel } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder().setName('points').setDescription('Cek jumlah poin kamu'),
  async execute(interaction) {
    const user = getPoints(interaction.user.id, interaction.guildId);
    const rankInfo = getRank(user.level);
    const xpNeeded = xpForLevel(user.level);

    const embed = themedEmbed('point', `Poin ${interaction.user.displayName}`, COLORS.points)
      .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 128 }))
      .setDescription(`Total poin: **${user.points.toLocaleString()}** ${e('point')}\n${DIVIDER}`)
      .addFields(
        { name: `${e('level')} Level`, value: `**${user.level}**`, inline: true },
        {
          name: `${e('rank')} Tier`,
          value: `${tierEmoji(rankInfo.name)} **${rankInfo.name}**`,
          inline: true,
        },
        { name: `${e('xp')} XP`, value: `**${user.xp}** / ${xpNeeded}`, inline: true },
        { name: `${e('xp')} Progress Level`, value: progressLine(user.xp, xpNeeded, 12), inline: false },
      )
      .setFooter({ text: 'Poin dari chat & voice • tukar coin lewat /exchange' });

    await interaction.reply({ embeds: [embed] });
  },
};
