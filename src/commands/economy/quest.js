const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getQuests } = require('../../database');
const { themedEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e, eo } = require('../../lib/emojis');
const { progressLine } = require('../../ui/embeds');

/** Dipakai juga oleh handler tombol klaim di interactionCreate.js. */
function buildQuest(user, guildId) {
  const quests = getQuests(user.id, guildId);
  const embed = themedEmbed('quest', `Quest ${user.displayName ?? user.username}`, COLORS.economy)
    .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 128 }));

  if (!quests.length) {
    embed.setDescription('Tidak ada quest. Coba lagi nanti.');
    return { embeds: [embed], components: [] };
  }

  const sections = { daily: [], weekly: [], monthly: [] };
  for (const row of quests) sections[row.period.split(':')[0]].push(row);

  const fields = [];
  const buttons = [];
  for (const [scope, title, icon] of [['daily', 'Harian', 'clock'], ['weekly', 'Mingguan', 'leaderboard'], ['monthly', 'Bulanan', 'bank']]) {
    fields.push({
      name: `${e(icon)} Quest ${title}`,
      value: DIVIDER,
    });
    for (const row of sections[scope]) {
      const done = row.progress >= row.target;
      const status = row.claimed
        ? `\n${e('success')} Reward diklaim`
        : `\n${e('coin')} Hadiah: **${row.reward.toLocaleString()}**`;
      fields.push({
        name: `${e(row.quest.emoji)} ${row.quest.label}`,
        value: `${progressLine(row.progress, row.target)}${status}`,
        inline: false,
      });
      // Tombol klaim hanya untuk yang selesai tapi belum diambil. State
      // (pemilik + periode + quest) masuk customId, bukan memori.
      if (done && !row.claimed) {
        buttons.push(new ButtonBuilder()
          .setCustomId(`quest_claim:${user.id}:${row.period}:${row.questId}`)
          .setLabel(`Klaim: ${row.quest.label}`)
          .setStyle(ButtonStyle.Success)
          .setEmoji(eo('coin')));
      }
    }
  }

  embed.addFields(fields);
  // Discord maksimal 5 tombol per baris; pecah jadi beberapa ActionRow.
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }
  return { embeds: [embed], components: rows.slice(0, 4) };
}

module.exports = {
  buildQuest,
  data: new SlashCommandBuilder().setName('quest').setDescription('Lihat quest harian, mingguan & bulanan kamu'),
  async execute(interaction) {
    await interaction.reply(buildQuest(interaction.user, interaction.guildId));
  },
};
