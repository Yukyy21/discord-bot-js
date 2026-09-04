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

test('XP menumpuk: lompat beberapa level dihitung bertahap (bukan dibagi biaya level awal)', () => {
  // Biaya naik per level (linear 100): menuju 3 butuh 200, menuju 4 butuh 300,
  // menuju 5 butuh 400. Dari level 2 dengan 750 XP:
  //  2→3 (sisa 550) → 3→4 (sisa 250) → 4→5 butuh 400, tak cukup. Berhenti di 4.
  const r = computeLevelUp({ level: 2, xp: 750 });
  assert.strictEqual(r.gained, 2);
  assert.strictEqual(r.level, 4);
  assert.strictEqual(r.xp, 250);
});

test('XP pas banyak tidak over-level (bug Gelombang Empat Belas)', () => {
  // Level 1 dengan 4500 XP. Biaya L1..L9 = 100,200,300,400,500,600,700,800,900
  // (jumlah 4500) → persis sampai level 10 dengan sisa 0. Kalaupun dibagi
  // biaya level awal (100) dengan cara lama, hasilnya 45 level — keliru.
  const r = computeLevelUp({ level: 1, xp: 4500 });
  assert.strictEqual(r.gained, 9);
  assert.strictEqual(r.level, 10);
  assert.strictEqual(r.xp, 0);
});

test('xpNeeded 0 tidak bikin pembagian nol', () => {
  const r = computeLevelUp({ level: 1, xp: 500 }, 0);
  assert.strictEqual(r.leveled, false);
});

test('levelProgress menghitung persentase', () => {
  assert.strictEqual(levelProgress({ level: 2, xp: 100 }).percent, 50);
  assert.strictEqual(levelProgress({ level: 1, xp: 0 }).percent, 0);
});
