const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// Arahkan DATA_DIR ke folder temp SEBELUM lapisan database dimuat, sama seperti
// test lain, supaya tidak menyentuh data/economy.db yang asli.
const paths = require('../src/lib/paths');
paths.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'give-limit-test-'));

const { getGiveUsage, checkGiveLimit, recordGive } = require('../src/database');
const { GIVE } = require('../src/config/constants');

// Tiket tanggal tetap supaya semua kasus dalam file ini memakai "hari yang sama".
const FIXED = new Date('2026-01-15T10:00:00Z');

test('checkGiveLimit mengizinkan transfer di bawah kedua batas', () => {
  const r = checkGiveLimit('u1', 'g', 1000, FIXED);
  assert.strictEqual(r.ok, true);
});

test('recordGive menghitung jumlah & nominal kumulatif', () => {
  recordGive('u1', 'g', 5000, FIXED);
  recordGive('u1', 'g', 3000, FIXED);
  const used = getGiveUsage('u1', 'g', FIXED);
  assert.strictEqual(used.count, 2);
  assert.strictEqual(used.totalCoin, 8000);
});

test('batas jumlah transfer ditolak setelah mencapai DAILY_LIMIT_COUNT', () => {
  // u2 sudah transfer DAILY_LIMIT_COUNT kali — berikutnya harus ditolak.
  for (let i = 0; i < GIVE.DAILY_LIMIT_COUNT; i++) recordGive('u2', 'g', 100, FIXED);
  const r = checkGiveLimit('u2', 'g', 100, FIXED);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'count');
});

test('batas nominal ditolak kalau amount melewati sisa jatah harian', () => {
  // u3 sudah pakai (DAILY_LIMIT_COIN - 100) hari ini, sisa 100.
  recordGive('u3', 'g', GIVE.DAILY_LIMIT_COIN - 100, FIXED);
  // 200 > sisa 100 → ditolak (walau belum kena batas jumlah transfer).
  const r = checkGiveLimit('u3', 'g', 200, FIXED);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'coin');
  // persis sisa 100 → masih diizinkan.
  assert.strictEqual(checkGiveLimit('u3', 'g', 100, FIXED).ok, true);
});

test('hari berbeda tidak mewarisi pemakaian hari sebelumnya', () => {
  recordGive('u4', 'g', GIVE.DAILY_LIMIT_COIN, FIXED);
  // Hari berikutnya jatah penuh lagi.
  const next = new Date('2026-01-16T00:00:00Z');
  const r = checkGiveLimit('u4', 'g', GIVE.DAILY_LIMIT_COIN, next);
  assert.strictEqual(r.ok, true);
});
