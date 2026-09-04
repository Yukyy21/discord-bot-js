const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// Arahkan DATA_DIR ke temp sebelum DB dimuat supaya tidak menyentuh data asli.
const paths = require('../src/lib/paths');
paths.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'levelup-weighted-test-'));

const { db, getPoints, getShopItems, getInventory } = require('../src/database');
const { reconcileLevels } = require('../src/lib/levelingManager');
const { weightedRandom, getTier } = require('../src/lib/tiers');

const G = 'guild-w';
const U1 = 'w-u1';
const U2 = 'w-u2';

// randomItem diputuskan oleh Math.random() di getLevelUpReward. Untuk membuat
// tes deterministik, paksa Math.random() = 0 (0 < itemChance>0) sehingga item
// selalu turun. Pemilihan itemnya sendiri dikendalikan lewat rng yang di-inject
// ke reconcileLevels, jadi tidak bergantung pada Math.random global.
const ORIGINAL_RANDOM = Math.random;

function withItemDrop() {
  Math.random = () => 0;
}

function restoreRandom() {
  Math.random = ORIGINAL_RANDOM;
}

test.after(() => restoreRandom());

// Item yang sudah dimiliki user sebagai { itemId: quantity }.
function owned(userId) {
  return getInventory(userId, G).reduce((m, r) => ((m[r.id] = r.quantity), m), {});
}

// Sama persis dengan yang dibangun reconcileLevels sebelum weightedRandom,
// supaya tes bisa memprediksi item yang akan digrant tanpa bergantung isi katalog.
function predictedAt(rng) {
  const items = getShopItems().map(item => ({ ...item, tier: getTier(item.price, item.name) }));
  return weightedRandom(items, 1, rng)[0];
}

function runLevelUp(userId, rng) {
  getPoints(userId, G); // buat baris points kalau belum ada, lalu set XP tinggi
  db.prepare('UPDATE points SET xp = 50000 WHERE userId = ? AND guildId = ?').run(userId, G);
  reconcileLevels(undefined, G, [{ userId, channelId: null }], rng);
}

test('level-up menggrant satu item lewat weightedRandom (deterministik)', () => {
  withItemDrop();
  try {
    const rngA = () => 0.001;
    const rngB = () => 0.99;

    const expectedA = predictedAt(rngA);
    const expectedB = predictedAt(rngB);
    assert.ok(expectedA && expectedB, 'weightedRandom harus memilih satu item untuk tiap rng');

    // Kasus 1: rng hampir 0 → item pertama yang menutupi bobot (Common cenderung).
    const beforeA = owned(U1);
    runLevelUp(U1, rngA);
    const gainedA = Object.keys(owned(U1)).find(id => owned(U1)[id] > (beforeA[id] || 0));
    assert.strictEqual(gainedA, String(expectedA.id), 'item yang digrant harus sesuai prediksi weightedRandom');

    // Kasus 2: rng lain → item lain yang deterministik (bukan Math.random acak).
    if (expectedA.id !== expectedB.id) {
      const beforeB = owned(U2);
      runLevelUp(U2, rngB);
      const gainedB = Object.keys(owned(U2)).find(id => owned(U2)[id] > (beforeB[id] || 0));
      assert.strictEqual(gainedB, String(expectedB.id));
    }
  } finally {
    restoreRandom();
  }
});
