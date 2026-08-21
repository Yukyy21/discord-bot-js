const { DAILY } = require('../config/constants');

function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
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
  const bonus = (streak - 1) * config.STREAK_BONUS;

  return {
    claimable: true,
    todayKey,
    streak,
    bonus,
    reward: config.BASE_REWARD + bonus,
    nextReward: config.BASE_REWARD + streak * config.STREAK_BONUS,
  };
}

module.exports = { computeDailyClaim, dateKey };
