const { DAILY } = require('../config/constants');
const { localDateKey } = require('./boss');

function dateKey(date) {
  return localDateKey(date);
}

/**
 * Hitung hasil klaim /daily. Fungsi murni supaya gampang dites:
 * perbandingan pakai tanggal (YYYY-MM-DD), bukan selisih jam, jadi klaim
 * jam 23.00 lalu 07.00 besoknya tetap dihitung berturut-turut.
 */
function computeDailyClaim(user, now = new Date(), config = DAILY) {
  const todayKey = dateKey(now);
  const lastKey = user?.lastDaily ? String(user.lastDaily).slice(0, 10) : null;

  if (lastKey === todayKey) {
    return { claimable: false, todayKey };
  }

  const yesterdayKey = dateKey(new Date(new Date(now).getTime() - config.DAY_MS));
  const streak = lastKey === yesterdayKey ? (user.streak || 0) + 1 : 1;
  const bonus = Math.min((streak - 1) * config.STREAK_BONUS, config.STREAK_MAX_BONUS);

  return {
    claimable: true,
    todayKey,
    streak,
    bonus,
    reward: config.BASE_REWARD + bonus,
    nextReward: config.BASE_REWARD + Math.min(streak * config.STREAK_BONUS, config.STREAK_MAX_BONUS),
  };
}

module.exports = { computeDailyClaim, dateKey };
