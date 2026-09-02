const { getPoints, setLevel, updateBalance, getShopItems, grantItem, addPoints, applyBuff, addQuestProgress } = require('../database');
const { LEVEL_ROLES } = require('../config');
const { xpForLevel } = require('../config/constants');
const { getRank, getLevelUpReward } = require('./ranks');
const { computeLevelUp } = require('./leveling');
const { e, tierEmoji } = require('./emojis');
const { getTier, weightedRandom } = require('./tiers');
const logger = require('./logger');

const log = logger.scope('Level');

/**
 * Kapan saja XP masuk (chat, /use item, voice, reward boss) level harus
 * direkonsiliasi ulang. Dulu ini hanya dikerjakan di event chat, jadi XP yang
 * masuk lewat jalur lain menggantung sampai user kebetulan chat lagi — padahal
 * boss/voice/item juga bisa menaikkan level.
 *
 * `users` = [{ userId, channelId? }]. Level-up yang terjadi diumumkan ke
 * POINT_CHANNEL_ID bila terisi (walau XP datang dari jalur lain), kalau tidak
 * ke channel konteks event atau channel teks pertama guild.
 */
function reconcileLevels(client, guildId, users) {
  const guild = client?.guilds?.cache?.get(guildId);
  for (const { userId, channelId } of users) {
    const stats = getPoints(userId, guildId);
    const xpNeeded = xpForLevel(stats.level);
    if (stats.xp < xpNeeded) continue;

    const { level: newLevel, xp: remainingXp } = computeLevelUp(stats, xpNeeded);
    setLevel(userId, guildId, newLevel, remainingXp);
    addQuestProgress(userId, guildId, 'level_up', newLevel - stats.level);

    const member = guild?.members?.cache?.get(userId);
    const roleId = LEVEL_ROLES[newLevel];
    if (roleId && member) {
      member.roles.add(roleId).catch(error => log.error(`Gagal memberi role level ${newLevel}:`, error.message));
    }

    const rankInfo = getRank(newLevel);
    const reward = getLevelUpReward(newLevel);
    addPoints(userId, guildId, applyBuff(userId, guildId, 'points', reward.points));
    updateBalance(userId, guildId, applyBuff(userId, guildId, 'coin', reward.coins));

    let rewardText = `${e('point')} +${reward.points} poin  ${e('coin')} +${reward.coins} coin`;
    if (reward.randomItem) {
      const items = getShopItems().map(item => ({
        ...item,
        tier: getTier(item.price, item.name),
      }));
      const [item] = weightedRandom(items, 1);
      if (item) {
        grantItem(userId, guildId, item.id);
        rewardText += `  ${e('inventory')} +${item.name}`;
      }
    }

    const content =
      `${e('level')} <@${userId}> naik ke level **${newLevel}** ${tierEmoji(rankInfo.name)} **${rankInfo.name}**\n` +
      `${e('daily')} Hadiah: ${rewardText}`;

    resolvePointChannel(client, guild, channelId)
      .then(channel => channel?.send({ content }))
      .catch(err => log.error(`Gagal mengumumkan level-up ${userId}:`, err.message));
  }
}

/**
 * Pilih channel untuk mengumumkan level-up: kalau POINT_CHANNEL_ID diisi,
 * notifikasi level-up tetap dikirim ke channel poin tersebut walaupun XP
 * datang dari jalur lain (voice/boss/item). Kalau bukan, dipakai channel
 * konteks event kalau tersedia, sisanya channel pertama guild.
 */
async function resolvePointChannel(client, guild, channelId) {
  const pointChannelId = process.env.POINT_CHANNEL_ID;
  if (pointChannelId) {
    return guild?.channels?.cache?.get(pointChannelId) ?? null;
  }
  if (!guild) return null;
  if (channelId) return guild.channels.cache.get(channelId) ?? null;
  return guild.channels.cache.find(ch => ch.type === 0) ?? null;
}

module.exports = { reconcileLevels };