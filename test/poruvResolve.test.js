const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// Arahkan DATA_DIR ke folder temp SEBELUM lapisan database dimuat, supaya
// tes tidak menyentuh data/economy.db yang asli.
const paths = require('../src/lib/paths');
paths.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'poruv-resolve-test-'));

const {
  redeemPoruvItem,
  getPendingRedemptions,
  resolveRedemption,
  addPoints,
  getPoints,
} = require('../src/database');

const G = 'guild-1';

test('redeem item manual mencatat klaim pending; resolve menandainya fulfilled', () => {
  addPoints('u1', G, 20000); // cukup buat Owocash (5.000)

  const res = redeemPoruvItem('u1', G, 'owocash_1m');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.redemption.status, 'pending');
  assert.strictEqual(res.grantedItemName, null); // manual, bukan Mythic

  // Muncul di daftar pending.
  const pending = getPendingRedemptions(G);
  assert.strictEqual(pending.length, 1);
  assert.strictEqual(pending[0].id, res.redemption.id);

  // Resolve by id; catatan: `row` yang dikembalikan adalah snapshot sebelum
  // update, jadi status sukses diverifikasi lewat hilangnya dari daftar pending.
  const resolved = resolveRedemption(res.redemption.id, G);
  assert.strictEqual(resolved.ok, true);
  assert.strictEqual(getPendingRedemptions(G).length, 0);
});

test('resolve ditolak: id tidak ada, atau klaim sudah bukan pending', () => {
  const notFound = resolveRedemption(999999, G);
  assert.strictEqual(notFound.ok, false);

  // Klaim yang sudah fulfilled tidak bisa diresolve ulang.
  addPoints('u2', G, 20000); // cukup buat custom role (10.000)
  const res = redeemPoruvItem('u2', G, 'custom_role');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(resolveRedemption(res.redemption.id, G).ok, true);
  const again = resolveRedemption(res.redemption.id, G);
  assert.strictEqual(again.ok, false);
});

test('resolve hanya berlaku dalam guild yang sama', () => {
  addPoints('u3', 'guild-lain', 20000);
  const res = redeemPoruvItem('u3', 'guild-lain', 'ewallet_25k');
  assert.strictEqual(res.ok, true);
  // Coba resolve dari guild lain — harus gagal karena id/guild tidak cocok.
  const wrong = resolveRedemption(res.redemption.id, G);
  assert.strictEqual(wrong.ok, false);
});

test('mythic_item digenapi otomatis, ter-catat fulfilled, dan Poruv terpotong tepat', () => {
  addPoints('u4', G, 10000);
  const before = getPoints('u4', G).points;
  const res = redeemPoruvItem('u4', G, 'mythic_item');
  assert.strictEqual(res.ok, true);
  assert.ok(res.grantedItemName, 'item Mythic langsung masuk inventori, bukan antrean admin');
  assert.strictEqual(res.redemption.status, 'fulfilled');
  // Poruv dipotong di dalam transaksi yang sama dengan pemberian item.
  assert.strictEqual(getPoints('u4', G).points, before - 2500);
});
