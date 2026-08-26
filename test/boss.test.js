const test = require('node:test');
const assert = require('node:assert');
const { BOSS_CATALOG } = require('../src/lib/bossCatalog');
const { pickBoss, rollDamage, attackCooldownLeft, computeRewards, rollLoot, dueSpawnSlot } = require('../src/lib/boss');
const { SHOP_CATALOG } = require('../src/database/shopCatalog');
const { BOSS } = require('../src/config/constants');

test('total peluang spawn tiga boss = 100%', () => {
  const total = Object.values(BOSS_CATALOG).reduce((sum, b) => sum + b.chance, 0);
  assert.strictEqual(total, 100);
  assert.strictEqual(BOSS_CATALOG.pump_freakin.chance, 45);
  assert.strictEqual(BOSS_CATALOG.clown_orca.chance, 45);
  assert.strictEqual(BOSS_CATALOG.ancient_mummy.chance, 10);
  assert.strictEqual(BOSS_CATALOG.ancient_mummy.special, true);
});

test('undian boss mengikuti bobot peluang', () => {
  assert.strictEqual(pickBoss(() => 0).key, 'pump_freakin');
  assert.strictEqual(pickBoss(() => 0.5).key, 'clown_orca');
  assert.strictEqual(pickBoss(() => 0.95).key, 'ancient_mummy');
});

test('damage selalu di dalam rentang boss', () => {
  const boss = BOSS_CATALOG.clown_orca;
  assert.strictEqual(rollDamage(boss, () => 0), boss.damage.min);
  assert.strictEqual(rollDamage(boss, () => 0.999999), boss.damage.max);
});

test('cooldown serang dihitung dari serangan terakhir', () => {
  const now = 1_000_000;
  assert.strictEqual(attackCooldownLeft(0, now), 0);
  assert.strictEqual(attackCooldownLeft(now - BOSS.ATTACK_COOLDOWN_MS, now), 0);
  assert.strictEqual(attackCooldownLeft(now - 1000, now), BOSS.ATTACK_COOLDOWN_MS - 1000);
});

test('hadiah dibagi ke top 3 damager dan last hit', () => {
  const boss = BOSS_CATALOG.pump_freakin;
  const rewards = computeRewards(
    boss,
    [
      { userId: 'a', damage: 5000 },
      { userId: 'b', damage: 3000 },
      { userId: 'c', damage: 1000 },
      { userId: 'd', damage: 100 },
    ],
    'd',
  );
  assert.deepStrictEqual(
    rewards.map(r => r.userId),
    ['a', 'b', 'd', 'c'],
  );
  assert.deepStrictEqual(rewards.find(r => r.userId === 'd').roles, ['last_hit']);
  assert.strictEqual(rewards.find(r => r.userId === 'a').coin, Math.round(boss.reward.coin * 0.4));
  // Damager ke-4 tanpa last hit tidak dapat apa pun.
  assert.strictEqual(rewards.length, 4);
});

test('top 1 yang sekaligus last hit dapat dua jatah dalam satu baris', () => {
  const boss = BOSS_CATALOG.ancient_mummy;
  const rewards = computeRewards(boss, [{ userId: 'a', damage: 9000 }], 'a');
  assert.strictEqual(rewards.length, 1);
  assert.deepStrictEqual(rewards[0].roles, ['top1', 'last_hit']);
  assert.ok(Math.abs(rewards[0].share - 0.6) < 1e-9);
});

test('buff loot menaikkan peluang dan jumlah drop', () => {
  const boss = BOSS_CATALOG.pump_freakin;
  assert.deepStrictEqual(rollLoot(boss, {}, () => 0.99), []);
  const doubled = rollLoot(boss, { lootRate: 2, dropAmount: 2 }, () => 0);
  assert.strictEqual(doubled.length, boss.loot.length);
  assert.ok(doubled.every(d => d.amount === 2));
});

test('semua item di tabel loot ada di katalog shop', () => {
  const ids = new Set(SHOP_CATALOG.map(([id]) => id));
  for (const boss of Object.values(BOSS_CATALOG)) {
    for (const drop of boss.loot) assert.ok(ids.has(drop.id), `item ${drop.id} tidak ada di shop`);
  }
});

test('jadwal spawn hanya jam 00 dan 12 waktu lokal event', () => {
  // Offset 7 (WIB): 17:00 UTC = 00:00 WIB hari berikutnya.
  assert.strictEqual(dueSpawnSlot(new Date('2026-08-25T17:05:00Z'), 7), '2026-08-26T00');
  assert.strictEqual(dueSpawnSlot(new Date('2026-08-25T05:30:00Z'), 7), '2026-08-25T12');
  assert.strictEqual(dueSpawnSlot(new Date('2026-08-25T08:00:00Z'), 7), null);
});

