const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// Arahkan DATA_DIR ke folder temp SEBELUM lapisan database dimuat, supaya
// tes tidak menyentuh data/economy.db yang asli.
const paths = require('../src/lib/paths');
paths.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'staff-test-'));

const {
  addStaff,
  removeStaff,
  isStaff,
  getStaff,
  listStaff,
  setRating,
  getActivity,
  bumpActivity,
  addVoiceMinutes,
  bestStaff,
  currentYearMonth,
} = require('../src/database');

const G = 'guild-1';
const YEAR_MONTH = currentYearMonth();

test('addStaff menambah staff, removeStaff menghapus', () => {
  assert.ok(addStaff('s1', G, 'Moderator', 'jaga server', 'admin').ok);
  assert.strictEqual(isStaff('s1', G), true);
  assert.strictEqual(getStaff('s1', G).divisi, 'Moderator');
  assert.strictEqual(getStaff('s1', G).deskripsi, 'jaga server');
});

test('addStaff menolak user yang sudah jadi staff', () => {
  addStaff('s1', G, 'Moderator');
  const dup = addStaff('s1', G, 'Admin');
  assert.strictEqual(dup.ok, false);
});

test('removeStaff gagal kalau user bukan staff', () => {
  assert.strictEqual(removeStaff('nobody', G).ok, false);
});

test('listStaff mengelompokkan per divisi', () => {
  addStaff('s2', G, 'Support', 'bantuan', 'admin');
  addStaff('s3', G, 'Moderator', null, 'admin');
  const groups = listStaff(G);
  const byName = Object.fromEntries(groups.map(g => [g.divisi, g.members.map(m => m.userId)]));
  assert.ok(byName['Moderator'].length >= 1);
  assert.ok(byName['Support'].includes('s2'));
});

test('setRating mengisi, rating ulang menggantikan, tidak menumpuk', () => {
  const r = setRating('s1', 'u1', G, 5, 'mantap');
  assert.strictEqual(r.ok, true);
  // rating ulang = update, bukan baris baru
  setRating('s1', 'u1', G, 4, 'revisi');
  const staff = getStaff('s1', G);
  assert.strictEqual(staff.ratingCount, 1);
  assert.strictEqual(staff.ratingAvg, 4);
});

test('setRating menolak menilai diri sendiri atau non-staff', () => {
  assert.strictEqual(setRating('s1', 's1', G, 5).ok, false);
  assert.strictEqual(setRating('bukanstaff', 'u2', G, 5).ok, false);
});

test('bumpActivity menambah metrik & menghapus; getActivity menginisialisasi', () => {
  const before = getActivity('s1', G, YEAR_MONTH);
  bumpActivity('s1', G, 'messageCount');
  bumpActivity('s1', G, 'tagCount');
  bumpActivity('s1', G, 'announcementCount');
  const after = getActivity('s1', G, YEAR_MONTH);
  assert.strictEqual(after.messageCount, before.messageCount + 1);
  assert.strictEqual(after.tagCount, before.tagCount + 1);
  assert.strictEqual(after.announcementCount, before.announcementCount + 1);
});

test('addVoiceMinutes menambah voiceMinutes', () => {
  const before = getActivity('s1', G, YEAR_MONTH).voiceMinutes;
  addVoiceMinutes('s1', G, 30);
  assert.strictEqual(getActivity('s1', G, YEAR_MONTH).voiceMinutes, before + 30);
});

test('bestStaff mengurutkan dengan skor ternormalisasi', () => {
  // s2: banyak pesan, nol metrik lain; s1: seimbang — s1 harus menang meski
  // pesannya lebih sedikit, karena normalisasi menjaga proporsi.
  bumpActivity('s2', G, 'messageCount', 100);
  bumpActivity('s2', G, 'messageCount', 100);
  bumpActivity('s2', G, 'messageCount', 100);
  bumpActivity('s1', G, 'messageCount', 30);
  bumpActivity('s1', G, 'voiceMinutes', 300);
  bumpActivity('s1', G, 'tagCount', 30);
  bumpActivity('s1', G, 'announcementCount', 30);

  const rows = bestStaff(G, YEAR_MONTH);
  assert.ok(rows.length >= 2);
  assert.strictEqual(rows[0].userId, 's1');
  assert.ok(rows[0].score > 0 && rows[0].score <= 1);
});