const test = require('node:test');
const assert = require('node:assert');
const {
  BOSS_ATTACKS,
  DEBUFF_META,
  pickDebuff,
  pickBossAttack,
  rollCounter,
  stealAmount,
  isDebuffRow,
  describeDebuff,
} = require('../src/lib/bossAttacks');
const { BOSS_CATALOG } = require('../src/lib/bossCatalog');
const { attackCooldownLeft, pickRampageTargets } = require('../src/lib/boss');
const { BOSS } = require('../src/config/constants');

test('cooldown serang dasar 10 detik', () => {
  assert.strictEqual(BOSS.ATTACK_COOLDOWN_MS, 10 * 1000);
  assert.strictEqual(attackCooldownLeft(1000, 5000), 6000);
  assert.strictEqual(attackCooldownLeft(1000, 11000), 0);
});

test('debuff cooldown memperpanjang jeda serang', () => {
  assert.strictEqual(attackCooldownLeft(0 + 1000, 5000, 2), 16000);
  // Nilai < 1 tidak boleh mempercepat cooldown.
  assert.strictEqual(attackCooldownLeft(1000, 5000, 0.2), 6000);
});

test('semua serangan boss punya efek atau rampasan', () => {
  for (const attack of Object.values(BOSS_ATTACKS)) {
    if (attack.kind === 'steal') {
      assert.ok(attack.steal.percent > 0 && attack.steal.max > 0, attack.id);
      continue;
    }
    assert.ok(attack.effects.length > 0, attack.id);
    for (const effect of attack.effects) assert.ok(DEBUFF_META[effect.key], effect.key);
  }
});

test('tiap boss punya daftar serangan valid dan peluang balas', () => {
  for (const boss of Object.values(BOSS_CATALOG)) {
    assert.ok(boss.counterChance > 0 && boss.counterChance <= 1, boss.key);
    assert.ok(boss.attacks.length > 0, boss.key);
    for (const id of boss.attacks) assert.ok(BOSS_ATTACKS[id], `${boss.key}: ${id}`);
    assert.ok(pickBossAttack(boss, () => 0));
  }
  assert.strictEqual(
    rollCounter(BOSS_CATALOG.pump_freakin, () => 0.99),
    false,
  );
  assert.strictEqual(
    rollCounter(BOSS_CATALOG.ancient_mummy, () => 0.01),
    true,
  );
});

test('debuff sejenis tidak menumpuk — dipakai yang terparah', () => {
  const rows = [
    { key: 'debuff:cooldown', value: 2, expiresAt: null, charges: null },
    { key: 'debuff:cooldown', value: 3, expiresAt: null, charges: null },
    { key: 'debuff:damage', value: 0.65, expiresAt: null, charges: null },
    { key: 'debuff:damage', value: 0.9, expiresAt: null, charges: null },
  ];
  assert.strictEqual(pickDebuff(rows, 'debuff:cooldown'), 3);
  assert.strictEqual(pickDebuff(rows, 'debuff:damage'), 0.65);
  assert.strictEqual(pickDebuff(rows, 'debuff:loot'), 1);
});

test('debuff kadaluarsa diabaikan', () => {
  const rows = [{ key: 'debuff:xp', value: 0.5, expiresAt: 1000, charges: null }];
  assert.strictEqual(pickDebuff(rows, 'debuff:xp', 2000), 1);
  assert.strictEqual(pickDebuff(rows, 'debuff:xp', 500), 0.5);
});

test('key debuff tidak pernah bentrok dengan key buff item', () => {
  assert.ok(isDebuffRow({ key: 'debuff:coin' }));
  assert.strictEqual(isDebuffRow({ key: 'coin' }), false);
  assert.strictEqual(isDebuffRow({ key: 'boss_damage' }), false);
});

test('rampasan coin dibatasi isi dompet dan batas atas', () => {
  const snatch = BOSS_ATTACKS.coin_snatch;
  assert.strictEqual(stealAmount(snatch, 10000), 300);
  assert.strictEqual(stealAmount(snatch, 0), 0);
  assert.strictEqual(stealAmount(snatch, 10_000_000), snatch.steal.max);
  assert.strictEqual(stealAmount(BOSS_ATTACKS.weakening_aura, 10000), 0);
});

test('amukan boss hanya menyasar penyerang yang masih hangat', () => {
  const now = 1_000_000;
  const targets = pickRampageTargets(
    [
      { userId: 'a', damage: 500, lastAttackAt: now - 1000 },
      { userId: 'b', damage: 900, lastAttackAt: now - 2000 },
      { userId: 'c', damage: 5000, lastAttackAt: now - BOSS.RAMPAGE_WINDOW_MS - 1 },
      { userId: 'd', damage: 100, lastAttackAt: now },
      { userId: 'e', damage: 50, lastAttackAt: now },
    ],
    now,
  );
  assert.deepStrictEqual(
    targets.map(t => t.userId),
    ['b', 'a', 'd'],
  );
  assert.strictEqual(targets.length, BOSS.RAMPAGE_TARGETS);
});

test('deskripsi debuff terbaca manusia', () => {
  const now = 0;
  assert.match(
    describeDebuff({ key: 'debuff:cooldown', value: 2, expiresAt: 5 * 60000, charges: null }, now),
    /Cooldown serang ×2/,
  );
  assert.match(
    describeDebuff({ key: 'debuff:miss', value: 1, expiresAt: null, charges: 1 }, now),
    /1x serangan/,
  );
});
