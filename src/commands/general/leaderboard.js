const { SlashCommandBuilder } = require('discord.js');
const {
  getBalanceLeaderboard,
  getPointsLeaderboard,
  getVoiceHoursLeaderboard,
  getLevelLeaderboard,
  getWeeklyLeaderboard,
} = require('../../database');
const { weeklyKey } = require('../../lib/quests');
const { themedEmbed, baseEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { renderLeaderboardCard } = require('../../cards/leaderboardCard');
const { getRank } = require('../../lib/ranks');
const { e, medal, tierEmoji } = require('../../lib/emojis');
const { paginate, pagerRow } = require('../../ui/pager');

const MAX_ROWS = 50;

const CATEGORIES = {
  balance: { label: 'Coin', emoji: 'coin', fetch: g => getBalanceLeaderboard(g, MAX_ROWS) },
  points: { label: 'Poin', emoji: 'point', fetch: g => getPointsLeaderboard(g, MAX_ROWS) },
  voice: { label: 'Jam Voice', emoji: 'voice', fetch: g => getVoiceHoursLeaderboard(g, MAX_ROWS) },
  rank: { label: 'Rank', emoji: 'rank', fetch: g => getLevelLeaderboard(g, MAX_ROWS) },
  mingguan: { label: 'Poin Mingguan', emoji: 'clock', fetch: g => getWeeklyLeaderboard(g, MAX_ROWS) },
};

function formatValue(sub, row) {
  if (sub === 'voice') {
    const total = row.voice_seconds || 0;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`;
  }
  if (sub === 'rank') {
    const rankInfo = getRank(row.level);
    return `${tierEmoji(rankInfo.name)} Lv.${row.level} — ${rankInfo.name}`;
  }
  return (sub === 'balance' ? row.balance : row.points).toLocaleString();
}

/** Dipakai juga oleh handler tombol pagination di interactionCreate.js. */
function buildLeaderboard(sub, guildId, page = 0) {
  const cat = CATEGORIES[sub] ?? CATEGORIES.points;
  const rows = cat.fetch(guildId);

  if (rows.length === 0) {
    return {
      embeds: [
        baseEmbed()
          .setColor(COLORS.neutral)
          .setDescription(`${e('info')} Belum ada data di server ini.`),
      ],
      components: [],
    };
  }

  const { slice, page: current, totalPages, offset } = paginate(rows, page, 10);

  const headLines = [`${e(cat.emoji)} Peringkat **${cat.label}** di server ini`];
  if (sub === 'mingguan') {
    headLines.push(`${e('clock')} Periode \`${weeklyKey().replace('weekly:', '')}\` — reset tiap Senin`);
  }

  const embed = themedEmbed('leaderboard', `Leaderboard ${cat.label}`, COLORS.leaderboard)
    .setDescription(
      [
        ...headLines,
        DIVIDER,
        slice
          .map(
            (row, i) => `${medal(offset + i)} <@${row.userId}>\n${e(cat.emoji)} **${formatValue(sub, row)}**`,
          )
          .join('\n'),
      ].join('\n'),
    )
    .setFooter({ text: `Halaman ${current + 1}/${totalPages} • coba /leaderboard card untuk versi gambar` });

  return { embeds: [embed], components: pagerRow(`lb_page:${sub}`, current, totalPages) };
}

module.exports = {
  buildLeaderboard,
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Lihat top user di server ini')
    .addSubcommand(s => s.setName('balance').setDescription('Top balance terbesar'))
    .addSubcommand(s => s.setName('points').setDescription('Top poin terbanyak'))
    .addSubcommand(s => s.setName('voice').setDescription('Top jam voice terbanyak'))
    .addSubcommand(s => s.setName('rank').setDescription('Top level/rank tertinggi'))
    .addSubcommand(s => s.setName('mingguan').setDescription('Top poin yang didapat pekan ini'))
    .addSubcommand(s =>
      s
        .setName('card')
        .setDescription('Leaderboard versi gambar')
        .addStringOption(o =>
          o
            .setName('kategori')
            .setDescription('Kategori leaderboard')
            .addChoices(
              { name: 'Coin', value: 'balance' },
              { name: 'Poin', value: 'points' },
              { name: 'Jam Voice', value: 'voice' },
              { name: 'Rank', value: 'rank' },
            ),
        ),
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'card') {
      return renderLeaderboardCard(interaction, interaction.options.getString('kategori'));
    }
    await interaction.reply(buildLeaderboard(sub, interaction.guildId, 0));
  },
};
