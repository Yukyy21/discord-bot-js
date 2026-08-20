const { getShopItems } = require('../db/database');

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const TIER_CONFIG = {
  Common:    { weight: 30, color: '#95a5a6' },
  Uncommon:  { weight: 25, color: '#2ecc71' },
  Rare:      { weight: 20, color: '#3498db' },
  Epic:      { weight: 12, color: '#9b59b6' },
  Legendary: { weight: 8,  color: '#e67e22' },
  Mythic:    { weight: 5,  color: '#e74c3c' },
};

function getTier(name, price) {
  if (price <= 1500) return 'Common';
  if (price <= 6500) return 'Uncommon';
  if (price <= 18000) return 'Rare';
  if (price <= 48000) return 'Epic';
  if (price <= 55000) return 'Legendary';
  return 'Mythic';
}

function weightedRandom(items, count) {
  const selected = [];
  const pool = [...items];
  while (selected.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((sum, i) => sum + TIER_CONFIG[i.tier].weight, 0);
    let rand = Math.random() * totalWeight;
    for (let j = 0; j < pool.length; j++) {
      rand -= TIER_CONFIG[pool[j].tier].weight;
      if (rand <= 0) {
        selected.push(pool[j]);
        pool.splice(j, 1);
        break;
      }
    }
  }
  return selected;
}

let currentStock = [];
let nextRefreshAt = 0;

function refreshShop() {
  const allItems = getShopItems().map(i => ({
    ...i,
    tier: getTier(i.name, i.price),
  }));
  currentStock = weightedRandom(allItems, 10);
  nextRefreshAt = Date.now() + REFRESH_INTERVAL_MS;
  console.log(`[Shop] Refreshed — ${currentStock.length} items`);
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

function getShopTimers() {
  const remaining = Math.max(0, nextRefreshAt - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return { remaining, minutes, seconds };
}

refreshShop();
setInterval(() => refreshShop(), REFRESH_INTERVAL_MS);

module.exports = { getShopStock, getShopItemById, getShopTimers, TIER_CONFIG };
