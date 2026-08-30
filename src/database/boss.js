// Penyimpanan mini boss: boss aktif, kontribusi damage, dan pembagian hadiah.
// Logika angkanya ada di src/lib/boss.js; file ini hanya query + transaksi.
const { db } = require('./connection');
const { getBoss } = require('../lib/bossCatalog');
const { BOSS } = require('../config/constants');
const { computeRewards, rollLoot } = require('../lib/boss');
const { updateBalance } = require('./users');
const { addPoints, addXp } = require('./points');
const { grantItem } = require('./shop');
const { getMultiplier, getDebuffMultiplier, applyBuff, consumeCharge } = require('./buffs');
const { getDebuff } = require('./debuffs');

/** Boss yang sedang hidup di satu guild (satu boss saja per guild). */
function getActiveBoss(guildId) {
  return db
    .prepare("SELECT * FROM boss_spawns WHERE guildId = ? AND status = 'active' ORDER BY id DESC LIMIT 1")
    .get(guildId);
}

function getBossById(bossId) {
  return db.prepare('SELECT * FROM boss_spawns WHERE id = ?').get(bossId);
}

/** Semua boss aktif di semua guild — dipakai saat boot untuk melanjutkan. */
function getAllActiveBosses() {
  return db.prepare("SELECT * FROM boss_spawns WHERE status = 'active' ORDER BY id").all();
}

/** True kalau jadwal spawn ini sudah pernah menghasilkan boss. */
function slotUsed(guildId, slot) {
  return Boolean(db.prepare('SELECT 1 FROM boss_spawns WHERE guildId = ? AND slot = ?').get(guildId, slot));
}

/** Catat boss baru. Mengembalikan baris boss yang tersimpan. */
function createBoss({ guildId, channelId, bossKey, slot = null, now = Date.now() }) {
  const boss = getBoss(bossKey);
  if (!boss) return null;
  const info = db
    .prepare(
      `
    INSERT INTO boss_spawns (guildId, channelId, bossKey, maxHp, hp, slot, spawnedAt, endsAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(guildId, channelId, bossKey, boss.hp, boss.hp, slot, now, now + BOSS.DESPAWN_MS);
  return getBossById(info.lastInsertRowid);
}

function setBossMessage(bossId, messageId) {
  db.prepare('UPDATE boss_spawns SET messageId = ? WHERE id = ?').run(messageId, bossId);
}

function getContribution(bossId, userId) {
  return db.prepare('SELECT * FROM boss_damage WHERE bossId = ? AND userId = ?').get(bossId, userId);
}

/** Kontribusi damage semua penyerang, urut dari terbesar. */
function getContributions(bossId) {
  return db
    .prepare('SELECT userId, damage, hits FROM boss_damage WHERE bossId = ? ORDER BY damage DESC')
    .all(bossId);
}

/**
 * Kurangi HP boss dan catat kontribusi penyerang dalam satu transaksi.
 * `damage` sudah termasuk buff `boss_damage` (dihitung saat serangan terjadi,
 * bukan saat boss mati — lihat Docs/bossplan.md).
 */
function applyDamage(bossId, userId, damage, now = Date.now()) {
  const row = getBossById(bossId);
  if (!row || row.status !== 'active') return { ok: false, reason: 'gone' };

  const dealt = Math.min(damage, row.hp);
  const hpLeft = row.hp - dealt;

  const run = db.transaction(() => {
    db.prepare('UPDATE boss_spawns SET hp = ?, lastHitUserId = ? WHERE id = ?').run(
      hpLeft,
      hpLeft <= 0 ? userId : row.lastHitUserId,
      bossId,
    );
    db.prepare(
      `
      INSERT INTO boss_damage (bossId, userId, damage, hits, lastAttackAt) VALUES (?, ?, ?, 1, ?)
      ON CONFLICT(bossId, userId) DO UPDATE SET
        damage = damage + excluded.damage,
        hits = hits + 1,
        lastAttackAt = excluded.lastAttackAt
    `,
    ).run(bossId, userId, dealt, now);
    if (hpLeft <= 0) {
      db.prepare("UPDATE boss_spawns SET status = 'defeated', endedAt = ? WHERE id = ?").run(now, bossId);
    }
  });
  run();

  const total = getContribution(bossId, userId);
  return { ok: true, dealt, hpLeft, defeated: hpLeft <= 0, totalDamage: total.damage, hits: total.hits };
}

/** Catat kapan boss terakhir mengamuk supaya jadwalnya tidak dobel. */
function markRampage(bossId, now = Date.now()) {
  db.prepare('UPDATE boss_spawns SET lastRampageAt = ? WHERE id = ?').run(now, bossId);
}

/** Boss kabur karena tidak ada yang menghabisi sampai batas waktu. */
function expireBoss(bossId, now = Date.now()) {
  db.prepare("UPDATE boss_spawns SET status = 'escaped', endedAt = ? WHERE id = ? AND status = 'active'").run(
    now,
    bossId,
  );
}

/**
 * Bagi hadiah boss yang sudah mati ke top 3 damager + last hit.
 * Coin dikali multiplier terbesar antara `coin` dan `quest_coin` (tidak
 * ditumpuk), XP & poin lewat applyBuff supaya Genesis/Astral ikut terhitung.
 * `boss_drop_amount` dipakai tepat sekali per user per kill.
 *
 * Hasil = [{ userId, roles, damage, coin, xp, points, loot: [{ id, amount }] }].
 */
function distributeRewards(bossId, rng = Math.random) {
  const row = getBossById(bossId);
  if (!row) return [];
  const boss = getBoss(row.bossKey);
  const guildId = row.guildId;

  const rewards = computeRewards(boss, getContributions(bossId), row.lastHitUserId);
  const paid = [];

  for (const entry of rewards) {
    const userId = entry.userId;
    // Buff coin biasa dan quest_coin tidak ditumpuk: ambil yang terbesar.
    const coinMult = Math.max(
      getMultiplier(userId, guildId, 'coin'),
      getMultiplier(userId, guildId, 'quest_coin'),
    );
    // Debuff `debuff:coin` dari serangan balik boss dikalikan SETELAH buff item.
    const coin = Math.round(entry.coin * coinMult * getDebuffMultiplier(userId, guildId, 'coin'));
    const xp = applyBuff(userId, guildId, 'xp', entry.xp);
    const points = applyBuff(userId, guildId, 'points', entry.points);

    const lootRate =
      getMultiplier(userId, guildId, 'boss_loot_rate') * getDebuff(userId, guildId, 'debuff:loot');
    const dropMult = getMultiplier(userId, guildId, 'boss_drop_amount');
    const usedCharge = dropMult > 1 && consumeCharge(userId, guildId, 'boss_drop_amount');
    const loot = rollLoot(boss, { lootRate, dropAmount: usedCharge ? dropMult : 1 }, rng).map(drop => ({
      ...drop,
      name: db.prepare('SELECT name FROM shop_items WHERE id = ?').get(drop.id)?.name ?? `Item #${drop.id}`,
    }));

    const pay = db.transaction(() => {
      updateBalance(userId, guildId, coin);
      addXp(userId, guildId, xp);
      addPoints(userId, guildId, points);
      for (const drop of loot) {
        for (let i = 0; i < drop.amount; i++) grantItem(userId, guildId, drop.id);
      }
    });
    pay();

    paid.push({ ...entry, coin, xp, points, loot });
  }

  return paid;
}

module.exports = {
  getActiveBoss,
  getBossById,
  getAllActiveBosses,
  slotUsed,
  createBoss,
  setBossMessage,
  getContribution,
  getContributions,
  applyDamage,
  markRampage,
  expireBoss,
  distributeRewards,
};
