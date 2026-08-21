const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getQuests } = require('../../database');
const { themedEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e, eo } = require('../../lib/emojis');
const { progressLine } = require('../../ui/embeds');

/** Dipakai juga oleh handler tombol klaim di interactionCreate.js. */
function buildQuest(user, guildId) {
  const quests = getQuests(user.id, guildId);
  const embed = themedEmbed('daily', `Quest ${user.displayName ?? user.username}`, COLORS.economy)
    .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 128 }));

  if (!quests.length) {
    embed.setDescription('Tidak ada quest. Coba lagi nanti.');
    return { embeds: [embed], components: [] };
  }

  const sections = { daily: [], weekly: [] };
  for (const row of quests) sections[row.period.startsWith('weekly') ? 'weekly' : 'daily'].push(row);

  const fields = [];
  const buttons = [];
  for (const [scope, title] of [['daily', 'Harian'], ['weekly', 'Mingguan']]) {
    fields.push({
      name: `${e(scope === 'daily' ? 'clock' : 'leaderboard')} Quest ${title}`,
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
  const components = buttons.length ? [new ActionRowBuilder().addComponents(buttons.slice(0, 5))] : [];
  return { embeds: [embed], components };
}

module.exports = {
  buildQuest,
  data: new SlashCommandBuilder().setName('quest').setDescription('Lihat quest harian & mingguan kamu'),
  async execute(interaction) {
    await interaction.reply(buildQuest(interaction.user, interaction.guildId));
  },
};
