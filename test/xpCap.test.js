const test = require('node:test');
const assert = require('node:assert');
const { capChatXp, resetXpCap } = require('../src/lib/xpCap');
const { CHAT } = require('../src/config/constants');

const T0 = 1_000_000_000_000;

test('di bawah plafon: XP penuh dan kembali 0 kalau tanpa XP', () => {
  assert.strictEqual(capChatXp('a', 'g', 20, T0), 20);
  assert.strictEqual(capChatXp('a', 'g', 0, T0), 0);
});

test('plafon memotong bagian yang melebihi jendela menit', () => {
  resetXpCap('a', 'g');
  const r1 = capChatXp('a', 'g', CHAT.XP_CAP_PER_MINUTE, T0);
  const r2 = capChatXp('a', 'g', 40, T0 + 5_000);
  assert.strictEqual(r1, CHAT.XP_CAP_PER_MINUTE);
  assert.strictEqual(r2, 0);
});

test('jendela bergulir: XP lama menguap setelah 60 detik', () => {
  resetXpCap('a', 'g');
  capChatXp('a', 'g', CHAT.XP_CAP_PER_MINUTE, T0);
  const r = capChatXp('a', 'g', 40, T0 + CHAT.XP_CAP_WINDOW_MS + 1);
  assert.strictEqual(r, 40);
});

test('jatah sisa dipotong sebagian dari XP pesan', () => {
  resetXpCap('a', 'g');
  capChatXp('a', 'g', 180, T0);
  const r = capChatXp('a', 'g', 40, T0 + 1_000);
  assert.strictEqual(r, 20);
});

test('jendela terpisah per user', () => {
  resetXpCap('a', 'g');
  resetXpCap('b', 'g');
  capChatXp('a', 'g', CHAT.XP_CAP_PER_MINUTE, T0);
  assert.strictEqual(capChatXp('b', 'g', 40, T0), 40);
});

test('resetXpCap mengosongkan jendela', () => {
  resetXpCap('a', 'g');
  capChatXp('a', 'g', CHAT.XP_CAP_PER_MINUTE, T0);
  resetXpCap('a', 'g');
  assert.strictEqual(capChatXp('a', 'g', 40, T0), 40);
});