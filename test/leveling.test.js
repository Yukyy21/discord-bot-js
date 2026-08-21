const test = require('node:test');
const assert = require('node:assert');
const { computeLevelUp, levelProgress } = require('../src/lib/leveling');
const { xpForLevel } = require('../src/config/constants');

test('xpForLevel naik linear 100 per level', () => {
  assert.strictEqual(xpForLevel(1), 100);
  assert.strictEqual(xpForLevel(7), 700);
});

test('belum cukup XP: tidak naik level', () => {
  const r = computeLevelUp({ level: 1, xp: 99 });
  assert.strictEqual(r.leveled, false);
  assert.strictEqual(r.level, 1);
  assert.strictEqual(r.xp, 99);
});

test('pas ambang: naik satu level, XP sisa 0', () => {
  const r = computeLevelUp({ level: 1, xp: 100 });
  assert.deepStrictEqual([r.leveled, r.level, r.xp, r.gained], [true, 2, 0, 1]);
});

test('XP menumpuk: bisa lompat beberapa level sekaligus', () => {
  const r = computeLevelUp({ level: 2, xp: 750 });
  assert.strictEqual(r.gained, 3);
  assert.strictEqual(r.level, 5);
  assert.strictEqual(r.xp, 150);
});

test('xpNeeded 0 tidak bikin pembagian nol', () => {
  const r = computeLevelUp({ level: 1, xp: 500 }, 0);
  assert.strictEqual(r.leveled, false);
});

test('levelProgress menghitung persentase', () => {
  assert.strictEqual(levelProgress({ level: 2, xp: 100 }).percent, 50);
  assert.strictEqual(levelProgress({ level: 1, xp: 0 }).percent, 0);
});
