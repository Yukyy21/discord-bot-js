const { xpForLevel } = require('../config/constants');

/**
 * Hitung hasil level-up dari statistik poin user. Fungsi murni: tidak menyentuh
 * database, jadi bisa dites langsung.
 * Bisa lompat lebih dari satu level kalau XP menumpuk banyak.
 */
function computeLevelUp({ level, xp }, xpNeeded = xpForLevel(level)) {
  if (xpNeeded <= 0 || xp < xpNeeded) {
    return { leveled: false, level, xp, gained: 0, xpNeeded };
  }
  const gained = Math.floor(xp / xpNeeded);
  return {
    leveled: true,
    level: level + gained,
    xp: xp % xpNeeded,
    gained,
    xpNeeded,
  };
}

/** Progres XP user pada level berjalan, dipakai kartu & embed. */
function levelProgress({ level, xp }) {
  const xpNeeded = xpForLevel(level);
  return { xp, xpNeeded, percent: xpNeeded > 0 ? Math.min(100, Math.floor((xp / xpNeeded) * 100)) : 0 };
}

module.exports = { computeLevelUp, levelProgress };
