const {
  getPoints,
  addPoints,
  addXp,
  setPendingWords,
  applyBuff,
  addQuestProgress,
} = require('../database');
const { CHAT, xpForLevel } = require('../config/constants');
const { reconcileLevels } = require('../lib/levelingManager');
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
    if (chunks > 0)
      addPoints(userId, guildId, applyBuff(userId, guildId, 'points', chunks * CHAT.POINTS_PER_CHUNK));
    setPendingWords(userId, guildId, totalWords % CHAT.WORDS_PER_POINT);

    const xpGain = Math.min(words * CHAT.XP_PER_WORD, CHAT.MAX_XP_PER_MESSAGE);
    addXp(userId, guildId, applyBuff(userId, guildId, 'xp', xpGain));

    const after = getPoints(userId, guildId);
    const xpNeeded = xpForLevel(after.level);
    if (after.xp < xpNeeded) return;

    await reconcileLevels(message.client, guildId, [{ userId, channelId: message.channelId }]);
  },
};
