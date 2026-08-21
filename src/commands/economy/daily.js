const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, claimDaily } = require('../../database');
const { DAILY } = require('../../config/constants');
const { themedEmbed, infoEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Klaim reward harian, makin rajin makin besar'),
  async execute(interaction) {
    const user = getUser(interaction.user.id, interaction.guildId);
    const now = new Date();

    // Perbandingan pakai tanggal (YYYY-MM-DD), bukan selisih jam, supaya klaim
    // jam 23.00 lalu jam 07.00 besoknya tetap dihitung dua hari berturut-turut.
    const todayKey = now.toISOString().slice(0, 10);
    const lastKey = user.lastDaily ? user.lastDaily.slice(0, 10) : null;

    if (lastKey === todayKey) {
      return interaction.reply({
        embeds: [infoEmbed('Sudah Diklaim', `${e('clock')} Kamu sudah klaim hari ini. Balik lagi besok ya!`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    const yesterdayKey = new Date(now.getTime() - DAILY.DAY_MS).toISOString().slice(0, 10);
    const streak = lastKey === yesterdayKey ? user.streak + 1 : 1;
    const bonus = (streak - 1) * DAILY.STREAK_BONUS;
    const reward = DAILY.BASE_REWARD + bonus;

    claimDaily(interaction.user.id, interaction.guildId, { reward, streak, dateKey: todayKey });

    const embed = themedEmbed('daily', 'Reward Harian Diklaim', COLORS.economy)
      .setDescription(`Kamu dapat **${reward.toLocaleString()}** ${e('coin')}\n${DIVIDER}`)
      .addFields(
        { name: `${e('streak')} Streak`, value: `**${streak}** hari`, inline: true },
        { name: `${e('coin')} Bonus Streak`, value: `+${bonus.toLocaleString()}`, inline: true },
        { name: `${e('clock')} Besok`, value: `**${(reward + DAILY.STREAK_BONUS).toLocaleString()}**`, inline: true },
      )
      .setFooter({ text: 'Jangan lewat sehari, streak-nya reset!' });

    await interaction.reply({ embeds: [embed] });
  },
};
