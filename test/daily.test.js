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
  // 12:00 UTC = 19:00 WIB, masih hari yang sama
  const r = computeDailyClaim({ lastDaily: '2026-01-10', streak: 3 }, at('2026-01-10T12:00:00Z'));
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
  const r = computeDailyClaim(
    { lastDaily: '2026-01-10T22:31:00.000Z', streak: 1 },
    at('2026-01-11T01:00:00Z'),
  );
  assert.strictEqual(r.streak, 2);
});

test('streak lanjut di batas hari WIB walau jam UTC masih hari yang sama', () => {
  // Mengunci perilaku timezone (Bug #4): tanggal hari "berganti" memakai
  // localDateKey yang menambah BOSS.UTC_OFFSET (default +7 WIB), bukan tanggal
  // UTC. 22:00 UTC masih 2026-01-10 di UTC, TAPI sudah 2026-01-11 05:00 di WIB.
  // Jadi klaim di jam ini dihitung hari baru; streak lanjut dari yesterdayKey
  // (2026-01-10). Kalau dulu logika UTC dipakai ulang, klaim ini malah ditolak
  // karena todayKey == lastKey == '2026-01-10'.
  const r = computeDailyClaim({ lastDaily: '2026-01-10', streak: 3 }, at('2026-01-10T22:00:00Z'));
  assert.strictEqual(r.todayKey, '2026-01-11');
  assert.strictEqual(r.claimable, true);
  assert.strictEqual(r.streak, 4);
});

test('nextReward = hadiah kalau streak lanjut besok', () => {
  const r = computeDailyClaim({ lastDaily: null, streak: 0 }, at('2026-01-10T09:00:00Z'));
  assert.strictEqual(r.nextReward, r.reward + DAILY.STREAK_BONUS);
});
