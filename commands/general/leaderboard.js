const { SlashCommandBuilder } = require('discord.js');
const { getBalanceLeaderboard, getPointsLeaderboard, getVoiceHoursLeaderboard, getLevelLeaderboard } = require('../../db/database');
const { baseEmbed } = require('../../utils/embeds');
const { renderLeaderboardCard } = require('../../utils/leaderboardCard');
const { getRank } = require('../../utils/ranks');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Lihat top user di server ini')
    .addSubcommand(s => s.setName('balance').setDescription('Top 10 balance terbesar'))
    .addSubcommand(s => s.setName('points').setDescription('Top 10 poin terbanyak'))
    .addSubcommand(s => s.setName('voice').setDescription('Top 10 jam voice terbanyak'))
    .addSubcommand(s => s.setName('rank').setDescription('Top 10 level/ rank tertinggi'))
    .addSubcommand(s => s.setName('card')
      .setDescription('Leaderboard dalam bentuk gambar')
      .addStringOption(o => o.setName('kategori')
        .setDescription('Kategori leaderboard')
        .setRequired(true)
        .addChoices(
          { name: 'Coin', value: 'balance' },
          { name: 'Poin', value: 'points' },
          { name: 'Jam Voice', value: 'voice' },
          { name: 'Rank', value: 'rank' },
        ))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'card') {
      try {
        await interaction.deferReply();
      } catch {
        return;
      }
      return renderLeaderboardCard(interaction, interaction.options.getString('kategori'));
    }

    let rows;
    let label;

    if (sub === 'voice') {
      rows = getVoiceHoursLeaderboard(interaction.guildId);
      label = 'Jam Voice';
    } else if (sub === 'rank') {
      rows = getLevelLeaderboard(interaction.guildId);
      label = 'Rank';
    } else {
      const isBalance = sub === 'balance';
      rows = isBalance
        ? getBalanceLeaderboard(interaction.guildId)
        : getPointsLeaderboard(interaction.guildId);
      label = isBalance ? 'Coin' : 'Poin';
    }

    if (rows.length === 0) {
      return interaction.reply({ embeds: [baseEmbed().setDescription('Belum ada data di server ini.')] });
    }

    const embed = baseEmbed()
      .setTitle(`🏆 Leaderboard ${label}`)
      .setColor(0xffd700)
      .setDescription(rows.map((row, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        let value;
        if (sub === 'voice') {
          const hours = Math.floor((row.voice_seconds || 0) / 3600);
          const minutes = Math.floor(((row.voice_seconds || 0) % 3600) / 60);
          value = hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`;
        } else if (sub === 'rank') {
          const rankInfo = getRank(row.level);
          value = `Lv.${row.level} — ${rankInfo.name}`;
        } else {
          value = (sub === 'balance' ? row.balance : row.points).toLocaleString();
        }
        return `${medal} <@${row.userId}> — **${value}**`;
      }).join('\n'))
      .setFooter({ text: 'Coba /leaderboard card untuk tampilan gambar!' });

    await interaction.reply({ embeds: [embed] });
  },
};
