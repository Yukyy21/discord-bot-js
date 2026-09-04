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
  // Biaya XP naik tiap level, jadi lompatan multi-level dihitung bertahap:
  // kurangi kebutuhan tiap level satu per satu, bukan dibagi sekali pakai
  // kebutuhan level awal (yang lama over-level — lihat Gelombang Empat Belas).
  let l = level;
  let x = xp;
  while (x >= xpForLevel(l)) {
    x -= xpForLevel(l);
    l += 1;
  }
  return {
    leveled: true,
    level: l,
    xp: x,
    gained: l - level,
    xpNeeded,
  };
}

/** Progres XP user pada level berjalan, dipakai kartu & embed. */
function levelProgress({ level, xp }) {
  const xpNeeded = xpForLevel(level);
  return { xp, xpNeeded, percent: xpNeeded > 0 ? Math.min(100, Math.floor((xp / xpNeeded) * 100)) : 0 };
}

module.exports = { computeLevelUp, levelProgress };
