const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// Arahkan DATA_DIR ke folder temp SEBELUM lapisan database dimuat, supaya
// tes tidak menyentuh data/economy.db yang asli. Setiap file test dijalankan
// Node di proses terpisah, jadi penggantian ini tidak bocor ke tes lain.
const paths = require('../src/lib/paths');
paths.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'give-test-'));

const { getUser, updateBalance, transferCoinsWithFee } = require('../src/database');
const { GIVE_FEE_RATE, xpForLevel } = require('../src/config/constants');

test('biaya /give dibakar (sink): pengirim kehilangan amount + fee, penerima dapat penuh', () => {
  updateBalance('s', 'g', 1_000);
  updateBalance('r', 'g', 0);

  const amount = 200;
  const fee = Math.ceil(amount * GIVE_FEE_RATE);
  transferCoinsWithFee('s', 'r', 'g', amount, fee);

  assert.strictEqual(getUser('s', 'g').balance, 1_000 - amount - fee);
  assert.strictEqual(getUser('r', 'g').balance, amount);
});

test('transfer normal tanpa fee tidak membakar apa pun', () => {
  const before = getUser('a', 'g').balance;
  require('../src/database').transferCoins('a', 'b', 'g', 50);
  assert.strictEqual(getUser('a', 'g').balance, before - 50);
  assert.strictEqual(getUser('b', 'g').balance, 50);
});

test('fee maupun saldo ikut konsisten di dalam satu transaksi', () => {
  const amount = 5;
  const fee = Math.ceil(amount * GIVE_FEE_RATE);
  updateBalance('x', 'g', 100);
  updateBalance('y', 'g', 7);
  transferCoinsWithFee('x', 'y', 'g', amount, fee);
  assert.strictEqual(getUser('x', 'g').balance, 100 - amount - fee);
  assert.strictEqual(getUser('y', 'g').balance, 7 + amount);
});

test('konstanta rate bisa dipakai ulang di tempat lain', () => {
  assert.strictEqual(GIVE_FEE_RATE, 0.05);
  assert.ok(typeof xpForLevel === 'function');
});