// Pintu masuk lapisan database.
//
// Import dari sini (`require('../../database')`), bukan langsung ke file
// users/points/shop, supaya pemakai tidak perlu tahu query-nya dipecah ke mana.
const { db } = require('./connection');
const { createTables, runMigrations } = require('./schema');
const users = require('./users');
const points = require('./points');
const shop = require('./shop');

createTables();
runMigrations();
shop.seedShop();
shop.backfillEffects();

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
};
