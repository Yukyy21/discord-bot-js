const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, claimDaily, addQuestProgress } = require('../../database');
const { computeDailyClaim } = require('../../lib/daily');
const { themedEmbed, infoEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Klaim reward harian, makin rajin makin besar'),
  async execute(interaction) {
    const user = getUser(interaction.user.id, interaction.guildId);
    const claim = computeDailyClaim(user, new Date());

    if (!claim.claimable) {
      return interaction.reply({
        embeds: [infoEmbed('Sudah Diklaim', `${e('clock')} Kamu sudah klaim hari ini. Balik lagi besok ya!`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    const { reward, streak, bonus, todayKey, nextReward } = claim;

    claimDaily(interaction.user.id, interaction.guildId, { reward, streak, dateKey: todayKey });
    addQuestProgress(interaction.user.id, interaction.guildId, 'daily', 1);

    const embed = themedEmbed('daily', 'Reward Harian Diklaim', COLORS.economy)
      .setDescription(`Kamu dapat **${reward.toLocaleString()}** ${e('coin')}\n${DIVIDER}`)
      .addFields(
        { name: `${e('streak')} Streak`, value: `**${streak}** hari`, inline: true },
        { name: `${e('coin')} Bonus Streak`, value: `+${bonus.toLocaleString()}`, inline: true },
        { name: `${e('clock')} Besok`, value: `**${nextReward.toLocaleString()}**`, inline: true },
      )
      .setFooter({ text: 'Jangan lewat sehari, streak-nya reset!' });

    await interaction.reply({ embeds: [embed] });
  },
};
