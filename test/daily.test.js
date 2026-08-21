const test = require('node:test');
const assert = require('node:assert');
const { computeDailyClaim } = require('../src/lib/daily');
const { DAILY } = require('../src/config/constants');

const at = iso => new Date(iso);

test('klaim pertama: streak 1, tanpa bonus', () => {
  const r = computeDailyClaim({ lastDaily: null, streak: 0 }, at('2026-01-10T09:00:00Z'));
  assert.strictEqual(r.claimable, true);
  assert.strictEqual(r.streak, 1);
  assert.strictEqual(r.bonus, 0);
  assert.strictEqual(r.reward, DAILY.BASE_REWARD);
});

test('klaim kedua di hari yang sama ditolak', () => {
  const r = computeDailyClaim({ lastDaily: '2026-01-10', streak: 3 }, at('2026-01-10T23:00:00Z'));
  assert.strictEqual(r.claimable, false);
});

test('klaim besoknya menambah streak walau selisih jam pendek', () => {
  const r = computeDailyClaim({ lastDaily: '2026-01-10', streak: 3 }, at('2026-01-11T07:00:00Z'));
  assert.strictEqual(r.streak, 4);
  assert.strictEqual(r.bonus, 3 * DAILY.STREAK_BONUS);
  assert.strictEqual(r.reward, DAILY.BASE_REWARD + 3 * DAILY.STREAK_BONUS);
});

test('bolong sehari: streak balik ke 1', () => {
  const r = computeDailyClaim({ lastDaily: '2026-01-10', streak: 9 }, at('2026-01-12T08:00:00Z'));
  assert.strictEqual(r.streak, 1);
  assert.strictEqual(r.bonus, 0);
});

test('lastDaily bisa berupa timestamp penuh', () => {
  const r = computeDailyClaim({ lastDaily: '2026-01-10T22:31:00.000Z', streak: 1 }, at('2026-01-11T01:00:00Z'));
  assert.strictEqual(r.streak, 2);
});

test('nextReward = hadiah kalau streak lanjut besok', () => {
  const r = computeDailyClaim({ lastDaily: null, streak: 0 }, at('2026-01-10T09:00:00Z'));
  assert.strictEqual(r.nextReward, r.reward + DAILY.STREAK_BONUS);
});
