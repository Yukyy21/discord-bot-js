const test = require('node:test');
const assert = require('node:assert');
const {
  isActive,
  pickMultiplier,
  applyMultiplier,
  withDurationBonus,
  formatRemaining,
  describeBuff,
} = require('../src/lib/buffs');
const { ABILITIES } = require('../src/lib/abilities');
const { SHOP_CATALOG, parseEffect, describeEffect } = require('../src/database/shopCatalog');

const NOW = 1_000_000;
const buff = (key, value, expiresAt = NOW + 60000, charges = null) => ({ key, value, expiresAt, charges });

test('buff kadaluarsa dan buff tanpa jatah tidak aktif', () => {
  assert.ok(isActive(buff('coin', 1.2), NOW));
  assert.ok(!isActive(buff('coin', 1.2, NOW - 1), NOW));
  assert.ok(isActive(buff('no_consume', 1, null, 2), NOW));
  assert.ok(!isActive(buff('no_consume', 1, null, 0), NOW));
});

test('buff sama tidak menumpuk, dipakai pengali terbesar', () => {
  const buffs = [buff('coin', 1.25), buff('coin', 1.05), buff('xp', 1.5)];
  assert.strictEqual(pickMultiplier(buffs, 'coin', NOW), 1.25);
  assert.strictEqual(pickMultiplier(buffs, 'points', NOW), 1);
});

test('buff kadaluarsa tidak ikut dihitung', () => {
  const buffs = [buff('coin', 2, NOW - 1), buff('coin', 1.1)];
  assert.strictEqual(pickMultiplier(buffs, 'coin', NOW), 1.1);
});

test('hasil kali reward dibulatkan', () => {
  assert.strictEqual(applyMultiplier(500, 1.25), 625);
  assert.strictEqual(applyMultiplier(7, 1.15), 8);
  assert.strictEqual(applyMultiplier(100, 1), 100);
});

test('bonus durasi hanya berlaku untuk buff berdurasi', () => {
  assert.strictEqual(withDurationBonus(60000, 1.25), 75000);
  assert.strictEqual(withDurationBonus(null, 1.25), null);
});

test('sisa waktu ditulis dalam menit dan jam', () => {
  assert.strictEqual(formatRemaining(30 * 60000), '30 menit');
  assert.strictEqual(formatRemaining(90 * 60000), '1 jam 30 menit');
  assert.strictEqual(formatRemaining(120 * 60000), '2 jam');
  assert.strictEqual(formatRemaining(null), 'sampai dipakai');
});

test('deskripsi buff menyebut efek dan sisanya', () => {
  assert.strictEqual(describeBuff(buff('coin', 1.25, NOW + 600000), NOW), 'Coin ×1.25 — sisa 10 menit');
  assert.strictEqual(describeBuff(buff('no_consume', 1, null, 3), NOW), 'Item tidak habis 3x pakai — sisa 3x');
});

test('semua efek katalog valid dan punya deskripsi', () => {
  for (const [id, name, , , effect] of SHOP_CATALOG) {
    const parsed = parseEffect(JSON.stringify(effect));
    assert.ok(parsed, `efek item ${id} ${name} tidak valid`);
    assert.ok(describeEffect(parsed)?.text, `efek item ${id} ${name} tidak punya deskripsi`);
    if (parsed.type === 'ability') assert.ok(ABILITIES[parsed.key], `ability ${parsed.key} belum terdaftar`);
  }
});

test('efek instan versi lama tetap dikenal', () => {
  assert.deepStrictEqual(parseEffect('{"type":"xp","value":30}'), { type: 'xp', value: 30 });
  assert.strictEqual(parseEffect('bukan json'), null);
  assert.strictEqual(parseEffect('{"type":"gacha"}'), null);
});
