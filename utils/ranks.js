const path = require('node:path');

const RANKS = [
  { name: 'Novice',    minLevel: 1,  color: '#95a5a6', logo: 'NOVICE.png' },
  { name: 'Apprentice', minLevel: 6,  color: '#2ecc71', logo: 'APPRENTICE.png' },
  { name: 'Adept',     minLevel: 11, color: '#3498db', logo: 'ADEPT.png' },
  { name: 'Veteran',   minLevel: 21, color: '#9b59b6', logo: 'VETERAN.png' },
  { name: 'Champion',  minLevel: 36, color: '#e67e22', logo: 'CHAMPION.png' },
  { name: 'Hero',      minLevel: 51, color: '#e74c3c', logo: 'HERO.png' },
  { name: 'Demigod',   minLevel: 71, color: '#f1c40f', logo: 'DEMIGOD.png' },
];

function getRank(level) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (level >= r.minLevel) rank = r;
  }
  return rank;
}

function getLevelUpReward(level) {
  const points = level * 10;
  const coins = level * 50;
  const itemChance = Math.min(0.1 + level * 0.01, 0.5);
  const randomItem = Math.random() < itemChance;
  return { points, coins, randomItem, itemChance };
}

module.exports = { RANKS, getRank, getLevelUpReward };
