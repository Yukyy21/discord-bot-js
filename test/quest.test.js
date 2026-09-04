const test = require('node:test');
const assert = require('node:assert');
const {
  QUEST_CATALOG,
  dailyKey,
  weeklyKey,
  monthlyKey,
  currentPeriodKeys,
  drawQuests,
} = require('../src/lib/quests');

const SCOPES = ['daily', 'weekly', 'monthly'];
const TYPES = [
  'chat',
  'voice',
  'daily',
  'use_item',
  'buy_item',
  'spend',
  'give',
  'level_up',
  'use_tier',
  'daily_streak',
  'boss_join',
  'boss_kill',
];

test('kunci periode punya format yang konsisten', () => {
  assert.match(dailyKey(new Date('2026-08-23T05:00:00Z')), /^daily:2026-08-23$/);
  assert.match(weeklyKey(new Date('2026-08-23T05:00:00Z')), /^weekly:\d{4}-W\d{2}$/);
  assert.match(monthlyKey(new Date('2026-08-23T05:00:00Z')), /^monthly:2026-08$/);
});

test('kunci periode mengikuti hari lokal (offset), bukan UTC', () => {
  // Mengunci perilaku timezone (Bug #4): periode harian/bulanan "ganti hari"
  // memakai localDateKey yang menambah BOSS.UTC_OFFSET (default +7 WIB). 22:00
  // UTC masih 31 Jan di UTC, tapi sudah 1 Feb 05:00 di WIB → kunci pindah bulan.
  assert.strictEqual(dailyKey(new Date('2026-01-31T22:00:00Z')), 'daily:2026-02-01');
  assert.strictEqual(monthlyKey(new Date('2026-01-31T22:00:00Z')), 'monthly:2026-02');
  // Kontrol: 05:00 UTC tetap masih hari/bulan yang sama di WIB (31 Jan 12:00).
  assert.strictEqual(dailyKey(new Date('2026-01-31T05:00:00Z')), 'daily:2026-01-31');
  assert.strictEqual(monthlyKey(new Date('2026-01-31T05:00:00Z')), 'monthly:2026-01');
});

test('currentPeriodKeys memuat ketiga scope', () => {
  const keys = currentPeriodKeys(new Date('2026-08-23T05:00:00Z'));
  assert.strictEqual(keys.length, 3);
  for (const scope of SCOPES) {
    assert.ok(
      keys.some(k => k.startsWith(`${scope}:`)),
      `scope ${scope} hilang`,
    );
  }
});

test('semua quest katalog valid', () => {
  for (const [id, q] of Object.entries(QUEST_CATALOG)) {
    assert.ok(SCOPES.includes(q.scope), `${id}: scope tidak dikenal`);
    assert.ok(TYPES.includes(q.type), `${id}: tipe tidak dikenal`);
    assert.ok(Number.isInteger(q.target) && q.target > 0, `${id}: target harus bilangan positif`);
    assert.ok(q.reward > 0, `${id}: reward harus positif`);
    assert.ok(q.emoji && q.label, `${id}: emoji & label wajib ada`);
    if (q.mode) assert.strictEqual(q.mode, 'max', `${id}: mode hanya boleh 'max'`);
    if (q.meta) assert.strictEqual(q.type, 'use_tier', `${id}: meta hanya untuk use_tier`);
  }
});

test('quest mode max (streak) dan meta (tier) ada di katalog', () => {
  assert.ok(
    Object.values(QUEST_CATALOG).some(q => q.mode === 'max'),
    'tidak ada quest ber-mode max',
  );
  assert.ok(
    Object.values(QUEST_CATALOG).some(q => q.meta),
    'tidak ada quest ber-meta',
  );
});

test('drawQuests hanya mengambil dari scope periodenya', () => {
  for (const scope of SCOPES) {
    const picked = drawQuests(`${scope}:x`, 99);
    assert.ok(picked.length > 0, `pool ${scope} kosong`);
    for (const q of picked) assert.strictEqual(q.scope, scope);
  }
});

test('undian tidak menghasilkan duplikat dan hormati jumlah permintaan', () => {
  const picked = drawQuests('daily:x', 3);
  assert.strictEqual(picked.length, 3);
  assert.strictEqual(new Set(picked.map(q => q.id)).size, 3);
});

test('undian melebihi pool berhenti di isi pool', () => {
  for (const scope of SCOPES) {
    const size = Object.values(QUEST_CATALOG).filter(q => q.scope === scope).length;
    assert.strictEqual(drawQuests(`${scope}:x`, 99).length, size);
  }
});
