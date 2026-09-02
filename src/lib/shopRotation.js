const { getShopItems } = require('../database');
const { SHOP } = require('../config/constants');
const { TIER_CONFIG, getTier, weightedRandom } = require('./tiers');
const logger = require('./logger');

const log = logger.scope('Shop');

const { REFRESH_INTERVAL_MS, STOCK_SIZE } = SHOP;

// Stok sekarang per-guild: setiap server punya undian dan jam rotasinya
// sendiri, jadi server yang sibuk tidak menghabiskan etalase server lain
// (Bugs.md #5).
const stocks = new Map(); // guildId -> { items, nextRefreshAt }

function refreshShop(guildId) {
  const allItems = getShopItems().map(i => ({
    ...i,
    tier: getTier(i.price, i.name),
  }));
  const items = weightedRandom(allItems, STOCK_SIZE);
  stocks.set(guildId, { items, nextRefreshAt: Date.now() + REFRESH_INTERVAL_MS });
  log.info(`Refreshed (guild ${guildId}) — ${items.length} items`);
  return items;
}

function getShopStock(guildId = '') {
  const stock = stocks.get(guildId);
  if (!stock || Date.now() >= stock.nextRefreshAt) {
    return refreshShop(guildId);
  }
  return stock.items;
}

function getShopItemById(guildId, id) {
  return getShopStock(guildId).find(i => i.id === id) || null;
}

function getShopRefreshAt(guildId = '') {
  getShopStock(guildId);
  return stocks.get(guildId).nextRefreshAt;
}

function getShopTimers(guildId = '') {
  const remaining = Math.max(0, getShopRefreshAt(guildId) - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return { remaining, minutes, seconds };
}

// Rotasi terus berjalan walau tidak ada yang membuka /shop: setiap guild yang
// sudah pernah melihat shop diundi ulang pada iramanya sendiri.
setInterval(() => {
  for (const guildId of stocks.keys()) {
    refreshShop(guildId);
  }
}, REFRESH_INTERVAL_MS);

module.exports = {
  getShopStock,
  getShopItemById,
  getShopTimers,
  getShopRefreshAt,
  getTier,
  weightedRandom,
  TIER_CONFIG,
};
