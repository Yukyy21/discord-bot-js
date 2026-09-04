const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// DATA_DIR diarahkan ke folder temp SEBELUM lapisan database dimuat, supaya
// tes tidak menyentuh data/economy.db asli.
const paths = require('../src/lib/paths');
paths.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sturdy-ability-test-'));

const { useItem, grantItem, getInventory } = require('../src/database');

const G = 'guild-1';
const itemQty = (userId, itemId) =>
  getInventory(userId, G).find(r => r.id === itemId)?.quantity ?? 0;

// Item: Adamantine Ingot (23) = Sturdy; Blade of the Fallen King (21) = buff
// boss_damage (ability berjenis 'buff'); Holy Grail Fragmen (25) = xp_fill
// (ability instan); Tears of the Fallen (20) = daily_reset (ability instan).

test('Sturdy tetap melindungi ability buff (item tidak habis)', () => {
  grantItem('u1', G, 23);
  grantItem('u1', G, 21);
  useItem('u1', G, 23); // aktifkan Sturdy

  const res = useItem('u1', G, 21); // ability buff non-instan
  assert.strictEqual(res.ok, true);
  assert.match(res.message, /Item tidak berkurang berkat \*\*Sturdy\*\*\./);
  assert.strictEqual(itemQty('u1', 21), 1, 'ability buff tetap ada berkat Sturdy');
});

test('Sturdy TIDAK melindungi ability instan (xp_fill): item habis dipakai', () => {
  grantItem('u2', G, 23); // Sturdy
  grantItem('u2', G, 25); // Holy Grail Fragmen (xp_fill) x1
  useItem('u2', G, 23);

  const res = useItem('u2', G, 25);
  assert.strictEqual(res.ok, true);
  assert.doesNotMatch(res.message, /Item tidak berkurang/);
  assert.strictEqual(itemQty('u2', 25), 0, 'xp_fill habis walau Sturdy aktif');
});

test('Sturdy TIDAK melindungi ability instan (daily_reset): item habis dipakai', () => {
  grantItem('u3', G, 23); // Sturdy
  grantItem('u3', G, 20); // Tears of the Fallen (daily_reset) x1
  useItem('u3', G, 23);

  const res = useItem('u3', G, 20);
  assert.strictEqual(res.ok, true);
  assert.doesNotMatch(res.message, /Item tidak berkurang/);
  assert.strictEqual(itemQty('u3', 20), 0, 'Tears habis walau Sturdy aktif');
});

test('Sturdy tidak melindungi item yang justru memberi Sturdy (no dupe)', () => {
  grantItem('u4', G, 23); // satu ingot
  const res = useItem('u4', G, 23);
  assert.strictEqual(res.ok, true);
  assert.doesNotMatch(res.message, /Item tidak berkurang/);
  assert.strictEqual(itemQty('u4', 23), 0, 'ingot yang memberi Sturdy tidak dipakai gratis');
});
