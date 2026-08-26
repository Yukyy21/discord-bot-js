// Logika murni mini boss: undian boss, hitung damage, pembagian hadiah, dan
// jadwal spawn. Tanpa SQL dan tanpa Discord supaya bisa dites langsung.
const { BOSS_CATALOG, getBoss } = require('./bossCatalog');
const { BOSS } = require('../config/constants');

/** Pilih sasaran amukan boss: penyerang terbaru (window RAMPAGE_WINDOW_MS). */
function pickRampageTargets(contributions, now = Date.now()) {
  return [...contributions]
    .filter(c => c.lastAttackAt && now - c.lastAttackAt <= BOSS.RAMPAGE_WINDOW_MS)
    .sort((a, b) => b.damage - a.damage)
    .slice(0, BOSS.RAMPAGE_TARGETS);
}

/** Undi satu boss sesuai kolom `chance` di katalog (45 / 45 / 10). */
function pickBoss(rng = Math.random) {
  const list = Object.values(BOSS_CATALOG);
  const total = list.reduce((sum, b) => sum + b.chance, 0);
  let roll = rng() * total;
  for (const boss of list) {
    roll -= boss.chance;
    if (roll <= 0) return boss;
  }
  return list[list.length - 1];
}

/** Damage dasar satu klik tombol serang, sebelum buff `boss_damage`. */
function rollDamage(boss, rng = Math.random) {
  const { min, max } = boss.damage;
  return Math.floor(min + rng() * (max - min + 1));
}

/**
 * Sisa cooldown serang dalam ms. 0 berarti boleh menyerang.
 * `cooldownMult` = debuff `debuff:cooldown` dari serangan balik boss (>= 1).
 */
function attackCooldownLeft(lastAttackAt, now = Date.now(), cooldownMult = 1) {
  if (!lastAttackAt) return 0;
  const cooldownMs = Math.round(BOSS.ATTACK_COOLDOWN_MS * Math.max(1, cooldownMult));
  return Math.max(0, lastAttackAt + cooldownMs - now);
}

/**
 * Bagi hadiah boss: top 3 damager + player yang memberi last hit.
 * Satu orang bisa dapat dua jatah (mis. top 1 sekaligus last hit); jatahnya
 * dijumlahkan jadi satu baris supaya pemberian hadiah cukup sekali per user.
 *
 * `contributions` = [{ userId, damage }] urut bebas.
 * Hasil = [{ userId, roles: ['top1'|'top2'|'top3'|'last_hit'], share, damage,
 *            coin, xp, points }] urut dari jatah terbesar.
 */
function computeRewards(boss, contributions, lastHitUserId) {
  const ranked = [...contributions].sort((a, b) => b.damage - a.damage).slice(0, 3);
  const byUser = new Map();

  const add = (userId, role, share) => {
    if (!userId) return;
    const row = byUser.get(userId) ?? { userId, roles: [], share: 0, damage: 0 };
    row.roles.push(role);
    row.share += share;
    row.damage = contributions.find(c => c.userId === userId)?.damage ?? row.damage;
    byUser.set(userId, row);
  };

  ranked.forEach((entry, index) => add(entry.userId, BOSS.TOP_ROLES[index], BOSS.TOP_SHARES[index]));
  add(lastHitUserId, 'last_hit', BOSS.LAST_HIT_SHARE);

  return [...byUser.values()]
    .map(row => ({
      ...row,
      coin: Math.round(boss.reward.coin * row.share),
      xp: Math.round(boss.reward.xp * row.share),
      points: Math.round(boss.reward.points * row.share),
    }))
    .sort((a, b) => b.share - a.share || b.damage - a.damage);
}

/**
 * Undi loot untuk satu penerima hadiah.
 * `lootRate` = pengali dari buff `boss_loot_rate` (Void Grip),
 * `dropAmount` = pengali dari buff `boss_drop_amount` (Heavy Impact).
 * Hasil = [{ id, amount }].
 */
function rollLoot(boss, { lootRate = 1, dropAmount = 1 } = {}, rng = Math.random) {
  const drops = [];
  for (const entry of boss.loot) {
    const chance = Math.min(1, entry.chance * lootRate);
    if (rng() >= chance) continue;
    drops.push({ id: entry.id, amount: Math.max(1, Math.round(entry.amount * dropAmount)) });
  }
  return drops;
}

/**
 * Waktu lokal server event (default WIB, ubah lewat BOSS_UTC_OFFSET).
 * Dipakai supaya "jam 12 malam & 12 siang" tidak ikut zona mesin hosting.
 */
function localParts(date = new Date(), offsetHours = BOSS.UTC_OFFSET) {
  const shifted = new Date(date.getTime() + offsetHours * 3600 * 1000);
  return {
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    slot: `${shifted.toISOString().slice(0, 10)}T${String(shifted.getUTCHours()).padStart(2, '0')}`,
  };
}

/**
 * Kunci jadwal spawn kalau sekarang berada di dalam jam spawn (00 & 12),
 * null kalau bukan waktunya. Kunci disimpan di database supaya satu jadwal
 * hanya menghasilkan satu boss walau bot restart atau interval jalan berkali.
 */
function dueSpawnSlot(date = new Date(), offsetHours = BOSS.UTC_OFFSET) {
  const { hour, slot } = localParts(date, offsetHours);
  return BOSS.SPAWN_HOURS.includes(hour) ? slot : null;
}

module.exports = {
  pickBoss,
  rollDamage,
  attackCooldownLeft,
  computeRewards,
  rollLoot,
  localParts,
  dueSpawnSlot,
  pickRampageTargets,
  getBoss,
};

