const { getShopItems } = require('../database');
const { SHOP } = require('../config/constants');
const { TIER_CONFIG, getTier, weightedRandom } = require('./tiers');
const logger = require('./logger');

const log = logger.scope('Shop');

const { REFRESH_INTERVAL_MS, STOCK_SIZE } = SHOP;

let currentStock = [];
let nextRefreshAt = 0;

function refreshShop() {
  const allItems = getShopItems().map(i => ({
    ...i,
    tier: getTier(i.price, i.name),
  }));
  currentStock = weightedRandom(allItems, STOCK_SIZE);
  nextRefreshAt = Date.now() + REFRESH_INTERVAL_MS;
  log.info(`Refreshed — ${currentStock.length} items`);
}

function getShopStock() {
  if (Date.now() >= nextRefreshAt || currentStock.length === 0) {
    refreshShop();
  }
  return currentStock;
}

function getShopItemById(id) {
  return currentStock.find(i => i.id === id) || null;
}

function getShopRefreshAt() {
  getShopStock();
  return nextRefreshAt;
}

function getShopTimers() {
  const remaining = Math.max(0, nextRefreshAt - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return { remaining, minutes, seconds };
}

refreshShop();
setInterval(() => refreshShop(), REFRESH_INTERVAL_MS);

module.exports = {
  getShopStock,
  getShopItemById,
  getShopTimers,
  getShopRefreshAt,
  getTier,
  weightedRandom,
  TIER_CONFIG,
};
