const {
  getPoints,
  addPoints,
  addXp,
  setPendingWords,
  setLevel,
  updateBalance,
  getShopItems,
  grantItem,
} = require('../database');
const { LEVEL_ROLES } = require('../config');
const { CHAT, xpForLevel } = require('../config/constants');
const { getRank, getLevelUpReward } = require('../lib/ranks');
const { e, tierEmoji } = require('../lib/emojis');

const POINT_CHANNEL_ID = process.env.POINT_CHANNEL_ID;

// Penyaring anti-spam sengaja di memori: ini alat penyaring, bukan data
// ekonomi, jadi hilang saat restart tidak merugikan siapa pun.
const recentMessages = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    // Kalau POINT_CHANNEL_ID diisi, poin hanya jalan di channel itu.
    if (POINT_CHANNEL_ID && message.channel.id !== POINT_CHANNEL_ID) return;

    const words = message.content.trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) return;

    if (isSpam(message)) return;

    const userId = message.author.id;
    const guildId = message.guildId;
    const before = getPoints(userId, guildId);

    // Sisa kata dari pesan sebelumnya ikut dihitung, jadi chat pendek pun
    // lama-lama tetap jadi poin.
    const totalWords = words + before.pendingWords;
    const chunks = Math.floor(totalWords / CHAT.WORDS_PER_POINT);
    if (chunks > 0) addPoints(userId, guildId, chunks * CHAT.POINTS_PER_CHUNK);
    setPendingWords(userId, guildId, totalWords % CHAT.WORDS_PER_POINT);

    addXp(userId, guildId, Math.min(words * CHAT.XP_PER_WORD, CHAT.MAX_XP_PER_MESSAGE));

    const after = getPoints(userId, guildId);
    const xpNeeded = xpForLevel(after.level);
    if (after.xp < xpNeeded) return;

    await handleLevelUp(message, after, xpNeeded);
  },
};

/**
 * Pesan dianggap spam kalau datang lebih cepat dari COOLDOWN_MS sejak pesan
 * sebelumnya, atau isinya sama dengan pesan sebelumnya dalam jendela
 * DUPLICATE_WINDOW_MS. Timestamp dicatat untuk semua pesan — bukan cuma yang
 * lolos — supaya spam tanpa henti tidak pernah genap cooldown.
 */
function isSpam(message) {
  const key = `${message.guildId}:${message.author.id}`;
  const now = Date.now();
  const prev = recentMessages.get(key);
  const content = message.content.trim().toLowerCase();

  let spam = false;
  if (prev) {
    if (now - prev.at < CHAT.COOLDOWN_MS) spam = true;
    else if (
      prev.content === content &&
      now - prev.contentAt < CHAT.DUPLICATE_WINDOW_MS
    ) spam = true;
  }

  // Saat spam, konten lama dipertahankan agar jendela duplikat tidak ikut
  // bergeser dan pesan yang sama tetap terdeteksi begitu cooldown selesai.
  if (spam) recentMessages.set(key, { ...prev, at: now });
  else recentMessages.set(key, { at: now, content, contentAt: now });

  return spam;
}

/** Naikkan level, kasih role & hadiah, lalu umumkan di channel yang sama. */
async function handleLevelUp(message, stats, xpNeeded) {
  const userId = message.author.id;
  const guildId = message.guildId;

  // Bisa lompat lebih dari satu level kalau XP-nya menumpuk banyak.
  const newLevel = stats.level + Math.floor(stats.xp / xpNeeded);
  setLevel(userId, guildId, newLevel, stats.xp % xpNeeded);

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
  addPoints(userId, guildId, reward.points);
  updateBalance(userId, guildId, reward.coins);

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
