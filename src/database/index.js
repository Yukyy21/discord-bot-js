// Pintu masuk lapisan database.
//
// Import dari sini (`require('../../database')`), bukan langsung ke file
// users/points/shop, supaya pemakai tidak perlu tahu query-nya dipecah ke mana.
const { db } = require('./connection');
const { createTables, runMigrations } = require('./schema');
const users = require('./users');
const points = require('./points');
const shop = require('./shop');
const quests = require('./quests');
const admin = require('./admin');
const weekly = require('./weekly');
const voiceSessions = require('./voiceSessions');
const buffs = require('./buffs');
const debuffs = require('./debuffs');
const boss = require('./boss');
const poruvShop = require('./poruvShop');
const guildConfig = require('./guildConfig');
const staff = require('./staff');
const giveDaily = require('./giveDaily');
const botStats = require('./botStats');

createTables();
runMigrations();
shop.seedShop();
shop.syncEffects();
// Harga item yang pernah direbalance diterapkan ke DB yang sudah ada.
shop.rebalancePrices(require('./shopCatalog').REBALANCED_ITEM_IDS);

/** Gabungan data ekonomi + poin untuk kartu /profile dan /rank. */
function getProfile(userId, guildId) {
  const user = users.getUser(userId, guildId);
  const stats = points.getPoints(userId, guildId);
  return {
    ...user,
    points: stats.points,
    xp: stats.xp,
    level: stats.level,
    voice_seconds: stats.voice_seconds || 0,
  };
}

module.exports = {
  db,
  getProfile,
  ...users,
  ...points,
  ...shop,
  ...quests,
  ...admin,
  ...weekly,
  ...voiceSessions,
  ...buffs,
  ...debuffs,
  ...boss,
  ...poruvShop,
  ...guildConfig,
  ...staff,
  ...giveDaily,
  ...botStats,
};
