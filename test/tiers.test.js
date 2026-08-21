const test = require('node:test');
const assert = require('node:assert');
const { getTier, weightedRandom, TIER_CONFIG, ITEM_TIERS } = require('../src/lib/tiers');
const { SHOP_CATALOG } = require('../src/database/shopCatalog');

test('batas harga tiap tier', () => {
  assert.strictEqual(getTier(600), 'Common');
  assert.strictEqual(getTier(1500), 'Common');
  assert.strictEqual(getTier(1501), 'Uncommon');
  assert.strictEqual(getTier(6500), 'Uncommon');
  assert.strictEqual(getTier(18000), 'Rare');
  assert.strictEqual(getTier(48000), 'Epic');
  assert.strictEqual(getTier(55000), 'Legendary');
  assert.strictEqual(getTier(120000), 'Mythic');
});

test('rarity resmi dipakai lebih dulu daripada harga', () => {
  assert.strictEqual(getTier(45000, 'Adamantine Ingot'), 'Legendary');
  assert.strictEqual(getTier(45000), 'Epic');
});

test('semua item katalog punya rarity resmi', () => {
  for (const [, name] of SHOP_CATALOG) {
    assert.ok(ITEM_TIERS[name], `rarity "${name}" belum terdaftar`);
  }
});

test('katalog bawaan menghasilkan enam tier terisi', () => {
  const counts = {};
  for (const [, name, price] of SHOP_CATALOG) {
    const t = getTier(price, name);
    counts[t] = (counts[t] || 0) + 1;
  }
  for (const tier of Object.keys(TIER_CONFIG)) {
    assert.ok(counts[tier] > 0, `tier ${tier} kosong di katalog`);
  }
});

const pool = () => SHOP_CATALOG.map(([id, name, price]) => ({ id, name, price, tier: getTier(price, name) }));

test('undian mengambil item unik sebanyak yang diminta', () => {
  const picked = weightedRandom(pool(), 10);
  assert.strictEqual(picked.length, 10);
  assert.strictEqual(new Set(picked.map(i => i.id)).size, 10);
});

test('tidak pernah melebihi jumlah item yang tersedia', () => {
  const picked = weightedRandom(pool().slice(0, 3), 10);
  assert.strictEqual(picked.length, 3);
});

test('rng deterministik memilih item pertama yang bobotnya menutupi undian', () => {
  const items = [
    { id: 1, tier: 'Common' },
    { id: 2, tier: 'Mythic' },
  ];
  assert.strictEqual(weightedRandom(items, 1, () => 0)[0].id, 1);
  assert.strictEqual(weightedRandom(items, 1, () => 0.99)[0].id, 2);
});

test('item Common lebih sering keluar daripada Mythic', () => {
  let common = 0;
  let mythic = 0;
  for (let i = 0; i < 2000; i++) {
    const first = weightedRandom(pool(), 1)[0];
    if (first.tier === 'Common') common++;
    if (first.tier === 'Mythic') mythic++;
  }
  assert.ok(common > mythic, `common ${common} harus lebih banyak dari mythic ${mythic}`);
});

test('tier tidak dikenal diabaikan tanpa error', () => {
  assert.deepStrictEqual(weightedRandom([{ id: 1, tier: 'Nonsense' }], 1), []);
});
