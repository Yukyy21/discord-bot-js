const test = require('node:test');
const assert = require('node:assert');
const { itemEmoji, tierMark, ITEM_EMOJIS } = require('../src/lib/itemEmojis');
const { SHOP_CATALOG } = require('../src/database/shopCatalog');

test('semua item katalog punya emoji', () => {
  for (const [, name] of SHOP_CATALOG) {
    assert.ok(ITEM_EMOJIS[name], `emoji untuk "${name}" belum terdaftar`);
  }
});

test('mention emoji berformat discord', () => {
  assert.match(itemEmoji('Chrono Core'), /^<:[A-Za-z_]+:\d+>$/);
});

test('item tidak dikenal jatuh ke fallback', () => {
  assert.strictEqual(itemEmoji('Barang Palsu'), '📦');
});

test('tiap tier punya penanda sendiri', () => {
  const marks = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'].map(tierMark);
  assert.strictEqual(new Set(marks).size, 6);
});
