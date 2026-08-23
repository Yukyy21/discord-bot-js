const {
  getPoints,
  addPoints,
  addXp,
  setPendingWords,
  setLevel,
  updateBalance,
  getShopItems,
  grantItem,
  addQuestProgress,
  applyBuff,
} = require('../database');
const { LEVEL_ROLES } = require('../config');
const { CHAT, xpForLevel } = require('../config/constants');
const { getRank, getLevelUpReward } = require('../lib/ranks');
const { computeLevelUp } = require('../lib/leveling');
const { e, tierEmoji } = require('../lib/emojis');
const { shouldCountMessage } = require('../lib/antispam');

const POINT_CHANNEL_ID = process.env.POINT_CHANNEL_ID;


module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    // Kalau POINT_CHANNEL_ID diisi, poin hanya jalan di channel itu.
    if (POINT_CHANNEL_ID && message.channel.id !== POINT_CHANNEL_ID) return;

    const userId = message.author.id;
    const guildId = message.guildId;
    if (!shouldCountMessage(userId, guildId, message.content)) return;

    const words = message.content.trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) return;

    addQuestProgress(userId, guildId, 'chat', 1);


    const before = getPoints(userId, guildId);

    // Sisa kata dari pesan sebelumnya ikut dihitung, jadi chat pendek pun
    // lama-lama tetap jadi poin.
    const totalWords = words + before.pendingWords;
    const chunks = Math.floor(totalWords / CHAT.WORDS_PER_POINT);
    if (chunks > 0) addPoints(userId, guildId, applyBuff(userId, guildId, 'points', chunks * CHAT.POINTS_PER_CHUNK));
    setPendingWords(userId, guildId, totalWords % CHAT.WORDS_PER_POINT);

    const xpGain = Math.min(words * CHAT.XP_PER_WORD, CHAT.MAX_XP_PER_MESSAGE);
    addXp(userId, guildId, applyBuff(userId, guildId, 'xp', xpGain));

    const after = getPoints(userId, guildId);
    const xpNeeded = xpForLevel(after.level);
    if (after.xp < xpNeeded) return;

    await handleLevelUp(message, after, xpNeeded);
  },
};


/** Naikkan level, kasih role & hadiah, lalu umumkan di channel yang sama. */
async function handleLevelUp(message, stats, xpNeeded) {
  const userId = message.author.id;
  const guildId = message.guildId;

  // Bisa lompat lebih dari satu level kalau XP-nya menumpuk banyak.
  const { level: newLevel, xp: remainingXp, gained } = computeLevelUp(stats, xpNeeded);
  setLevel(userId, guildId, newLevel, remainingXp);
  addQuestProgress(userId, guildId, 'level_up', gained);

  const roleId = LEVEL_ROLES[newLevel];
  if (roleId && message.member) {
    try {
      await message.member.roles.add(roleId);
    } catch (error) {
      console.error(`Gagal memberi role level ${newLevel}:`, error.message);
    }
  }

  const rankInfo = getRank(newLevel);
  const reward = getLevelUpReward(newLevel);
  addPoints(userId, guildId, applyBuff(userId, guildId, 'points', reward.points));
  updateBalance(userId, guildId, applyBuff(userId, guildId, 'coin', reward.coins));

  let rewardText = `${e('point')} +${reward.points} poin  ${e('coin')} +${reward.coins} coin`;

  if (reward.randomItem) {
    const items = getShopItems();
    const item = items[Math.floor(Math.random() * items.length)];
    grantItem(userId, guildId, item.id);
    rewardText += `  ${e('inventory')} +${item.name}`;
  }

  await message.channel.send(
    `${e('level')} ${message.author} naik ke level **${newLevel}** ${tierEmoji(rankInfo.name)} **${rankInfo.name}**\n` +
      `${e('daily')} Hadiah: ${rewardText}`,
  );
}
