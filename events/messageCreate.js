const { db, getPoints, addPoints, addXp, updateBalance, getShopItems } = require('../db/database');
const { LEVEL_ROLES } = require('../config');
const { getRank, getLevelUpReward } = require('../utils/ranks');

const POINT_CHANNEL_ID = process.env.POINT_CHANNEL_ID;
const WORDS_PER_POINT = 7;
const POINT_AMOUNT = 2;
const XP_PER_WORD = 1;
const MAX_XP_PER_MSG = 20;

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    if (POINT_CHANNEL_ID && message.channel.id !== POINT_CHANNEL_ID) return;

    const words = message.content.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (words === 0) return;

    const user = getPoints(message.author.id, message.guildId);
    const total = words + user.pendingWords;
    const chunks = Math.floor(total / WORDS_PER_POINT);
    const pending = total % WORDS_PER_POINT;

    if (chunks > 0) addPoints(message.author.id, message.guildId, chunks * POINT_AMOUNT);
    db.prepare('UPDATE points SET pendingWords = ? WHERE userId = ? AND guildId = ?')
      .run(pending, message.author.id, message.guildId);

    const xpGain = Math.min(words * XP_PER_WORD, MAX_XP_PER_MSG);
    addXp(message.author.id, message.guildId, xpGain);

    const row = getPoints(message.author.id, message.guildId);
    const xpNeeded = row.level * 100;
    if (row.xp >= xpNeeded) {
      const newLevel = row.level + Math.floor(row.xp / xpNeeded);
      db.prepare('UPDATE points SET level = ?, xp = ? WHERE userId = ? AND guildId = ?')
        .run(newLevel, row.xp % xpNeeded, message.author.id, message.guildId);

      const roleId = LEVEL_ROLES[newLevel];
      if (roleId && message.member) {
        try { await message.member.roles.add(roleId); } catch (e) { console.error('Gagal assign role:', e); }
      }

      const rankInfo = getRank(newLevel);
      const reward = getLevelUpReward(newLevel);

      addPoints(message.author.id, message.guildId, reward.points);
      updateBalance(message.author.id, message.guildId, reward.coins);

      let rewardText = `+${reward.points} poin, +${reward.coins} coin`;

      if (reward.randomItem) {
        const items = getShopItems();
        const item = items[Math.floor(Math.random() * items.length)];
        db.prepare(`
          INSERT INTO user_items (userId, guildId, itemId, quantity) VALUES (?, ?, ?, 1)
          ON CONFLICT(userId, guildId, itemId) DO UPDATE SET quantity = quantity + 1
        `).run(message.author.id, message.guildId, item.id);
        rewardText += `, +${item.name}`;
      }

      await message.channel.send(`🎉 ${message.author} naik ke level **${newLevel}** (${rankInfo.name})!\nHadiah: ${rewardText}`);
    }
  },
};