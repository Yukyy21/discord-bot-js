const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// Arahkan DATA_DIR ke temp sebelum DB dimuat supaya tidak menyentuh data asli.
const paths = require('../src/lib/paths');
paths.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'equip-test-'));

const { db } = require('../src/database');
const { getInventory, setEquipped, getEquipCount, grantItem } = require('../src/database');
const { EQUIP_SLOTS } = require('../src/config/constants');

const G = 'g';
const U = 'u';

function seedItems() {
  // Pack item 1..(EQUIP_SLOTS+1) ke user.
  for (const id of [10, 11, 12, 13, 14, 15]) {
    db.prepare('INSERT OR IGNORE INTO shop_items (id, name, price, description) VALUES (?, ?, 100, ?)').run(
      id,
      `Item ${id}`,
      'x',
    );
    grantItem(U, G, id);
  }
}

test('equip item dan jumlah slot tercatat', () => {
  seedItems();
  assert.strictEqual(setEquipped(U, G, 10, true).ok, true);
  assert.strictEqual(setEquipped(U, G, 11, true).ok, true);
  assert.strictEqual(getEquipCount(U, G), 2);
  assert.strictEqual(getInventory(U, G).find(i => i.id === 10).equipped, 1);
});

test('equip item yang sama dua kali ditolak', () => {
  assert.strictEqual(setEquipped(U, G, 10, true).ok, false);
});

test('unaquip menurunkan slot', () => {
  assert.strictEqual(setEquipped(U, G, 10, false).ok, true);
  assert.strictEqual(getEquipCount(U, G), 1);
  assert.strictEqual(getInventory(U, G).find(i => i.id === 10).equipped, 0);
});

test('melebihi slot equip ditolak', () => {
  // Pastikan 10 lepas dari test 3, lalu isi 5 slot dengan 11-15.
  setEquipped(U, G, 12, true);
  setEquipped(U, G, 13, true);
  setEquipped(U, G, 14, true);
  setEquipped(U, G, 15, true);
  assert.strictEqual(getEquipCount(U, G), EQUIP_SLOTS);
  // Item 10 bebas (baru dilepas) tapi slot sudah penuh 5.
  const extra = setEquipped(U, G, 10, true);
  assert.strictEqual(extra.ok, false);
});

test('equip item yang tidak dimiliki ditolak', () => {
  assert.strictEqual(setEquipped(U, G, 999, true).ok, false);
});