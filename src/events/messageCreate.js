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
const { capChatXp } = require('../lib/xpCap');
const { isStaff, bumpActivity } = require('../database');

const POINT_CHANNEL_ID = process.env.POINT_CHANNEL_ID;
// Channel tempat pesan staff dihitung sebagai "announcement" untuk leaderboard
// bulanan. Comma-separated, pola sama seperti ADMIN_ROLE_IDS.
const ANNOUNCEMENT_CHANNEL_IDS = new Set(
  (process.env.ANNOUNCEMENT_CHANNEL_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
);

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    // Tracking aktivitas staff berdiri sendiri — jalan di semua channel, tak
    // terikat POINT_CHANNEL_ID. Pakai anti-spam yang sama supaya spam tidak
    // menggelembungkan skor pesan/tag/announcement.
    const userId = message.author.id;
    const guildId = message.guildId;
    if (shouldCountMessage(userId, guildId, message.content)) {
      if (isStaff(userId, guildId)) {
        bumpActivity(userId, guildId, 'messageCount');
        if (message.mentions.everyone || message.mentions.roles.size > 0) {
          bumpActivity(userId, guildId, 'tagCount');
        }
        if (ANNOUNCEMENT_CHANNEL_IDS.has(message.channelId)) {
          bumpActivity(userId, guildId, 'announcementCount');
        }
      }
    }

    // Kalau POINT_CHANNEL_ID diisi, poin hanya jalan di channel itu.
    if (POINT_CHANNEL_ID && message.channel.id !== POINT_CHANNEL_ID) return;

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

    // XP per pesan dibatasi per pesan (MAX_XP_PER_MESSAGE) dan per menit
    // (XP_CAP_PER_MINUTE, jendela bergulir) supaya spam tidak lebih untung.
    const xpGain = Math.min(words * CHAT.XP_PER_WORD, CHAT.MAX_XP_PER_MESSAGE);
    addXp(userId, guildId, capChatXp(userId, guildId, applyBuff(userId, guildId, 'xp', xpGain)));

    const after = getPoints(userId, guildId);
    const xpNeeded = xpForLevel(after.level);
    if (after.xp < xpNeeded) return;

    await reconcileLevels(message.client, guildId, [{ userId, channelId: message.channelId }]);
  },
};
