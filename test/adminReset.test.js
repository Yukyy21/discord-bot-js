const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

// Arahkan DATA_DIR ke folder temp SEBELUM lapisan database dimuat, supaya
// tes tidak menyentuh data/economy.db yang asli (pola yang sama dengan test lain).
const paths = require('../src/lib/paths');
paths.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-reset-test-'));

const { db, resetUser } = require('../src/database');

const G = 'guild-a';
const G2 = 'guild-b';
const U1 = 'u1'; // target reset
const U2 = 'u2'; // kontrol: guild sama, tidak boleh tersentuh
const U3 = 'u3'; // kontrol: guild lain, tidak boleh tersentuh

const NOW = Date.now();
const P = '2026-01';

// Seed satu baris di tiap tabel yang menyimpan data member demo user.
function seed() {
  // 4 tabel lama yang sudah dibersihkan sejak awal.
  db.prepare('INSERT INTO users (userId, guildId, balance, streak) VALUES (?, ?, 5000, 3)').run(U1, G);
  db.prepare('INSERT INTO points (userId, guildId, points, xp) VALUES (?, ?, 100, 50)').run(U1, G);
  db.prepare('INSERT INTO user_items (userId, guildId, itemId, quantity) VALUES (?, ?, 1, 2)').run(U1, G);
  db.prepare(
    'INSERT INTO quests (userId, guildId, period, questId, target, progress, claimed) VALUES (?, ?, ?, ?, 10, 10, 0)',
  ).run(U1, G, 'daily:2026-01-15', 'daily_claim');

  // 6 tabel baru yang ikut dibersihkan oleh reset.
  db.prepare('INSERT INTO give_daily (userId, guildId, dayKey, count, totalCoin) VALUES (?, ?, ?, 1, 5000)').run(
    U1,
    G,
    '2026-01-15',
  );
  db.prepare('INSERT INTO user_buffs (userId, guildId, key, value) VALUES (?, ?, ?, ?)').run(U1, G, 'coin', 2);
  db.prepare('INSERT INTO voice_sessions (userId, guildId, joinedAt, lastGrant) VALUES (?, ?, ?, ?)').run(
    U1,
    G,
    NOW,
    NOW,
  );
  db.prepare('INSERT INTO weekly_points (userId, guildId, period, points) VALUES (?, ?, ?, 25)').run(
    U1,
    G,
    '2026-W03',
  );
  db.prepare('INSERT INTO poruv_redemptions (userId, guildId, itemKey, itemName, price, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
    U1,
    G,
    'owocash',
    'Owocash',
    1000,
    NOW,
  );

  // Tiga tabel yang TIDAK boleh ikut dihapus (data staff, bukan data member).
  db.prepare('INSERT INTO staff (userId, guildId, divisi, addedAt, addedBy) VALUES (?, ?, ?, ?, ?)').run(
    U1,
    G,
    'Moderator',
    NOW,
    'admin',
  );
  db.prepare(
    'INSERT INTO staff_ratings (staffUserId, raterUserId, guildId, stars, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(U1, 'rater', G, 5, NOW, NOW);
  db.prepare('INSERT INTO staff_activity (userId, guildId, yearMonth, messageCount) VALUES (?, ?, ?, 10)').run(
    U1,
    G,
    P,
  );

  // Buff guild-wide (*) harus dipertahankan — bukan milik member.
  db.prepare("INSERT INTO user_buffs (userId, guildId, key, value) VALUES ('*', ?, ?, ?)").run(G, 'xp', 1.5);

  // boss_damage tidak ber-guild: seed boss di guild-a dan guild-b, lalu catat
  // damage U1 di keduanya (keduanya harus hilang setelah reset) + U2 di guild-a
  // (harus tetap).
  const ba = db.prepare('INSERT INTO boss_spawns (guildId, channelId, bossKey, maxHp, hp, status, spawnedAt, endsAt) VALUES (?, ?, ?, 1000, 1000, ?, ?, ?)').run(G, 'ch', 'mini', 'active', NOW, NOW + 3600000);
  const bb = db.prepare('INSERT INTO boss_spawns (guildId, channelId, bossKey, maxHp, hp, status, spawnedAt, endsAt) VALUES (?, ?, ?, 1000, 1000, ?, ?, ?)').run(G2, 'ch', 'mini', 'active', NOW, NOW + 3600000);
  db.prepare('INSERT INTO boss_damage (bossId, userId, damage, hits) VALUES (?, ?, 500, 5)').run(ba.lastInsertRowid, U1);
  db.prepare('INSERT INTO boss_damage (bossId, userId, damage, hits) VALUES (?, ?, 999, 9)').run(bb.lastInsertRowid, U1);
  db.prepare('INSERT INTO boss_damage (bossId, userId, damage, hits) VALUES (?, ?, 100, 1)').run(ba.lastInsertRowid, U2);

  // Kontrol: user lain di guild sama + guild lain, supaya filter guildId benar.
  db.prepare('INSERT INTO users (userId, guildId, balance) VALUES (?, ?, 777)').run(U2, G);
  db.prepare('INSERT INTO users (userId, guildId, balance) VALUES (?, ?, 888)').run(U3, G2);
  db.prepare('INSERT INTO give_daily (userId, guildId, dayKey, count, totalCoin) VALUES (?, ?, ?, 2, 9000)').run(
    U2,
    G,
    '2026-01-15',
  );
  db.prepare('INSERT INTO give_daily (userId, guildId, dayKey, count, totalCoin) VALUES (?, ?, ?, 1, 100)').run(
    U3,
    G2,
    '2026-01-15',
  );
}

function reset() {
  return resetUser(U1, G);
}

test('resetUser menghapus 10 tabel data member U1', () => {
  seed();
  const wiped = reset();

  // Nilai baris terhapus harus tercatat & masuk akal.
  assert.strictEqual(wiped.users, 1);
  assert.strictEqual(wiped.points, 1);
  assert.strictEqual(wiped.items, 1);
  assert.strictEqual(wiped.quests, 1);
  assert.strictEqual(wiped.give, 1);
  assert.strictEqual(wiped.buffs, 1);
  assert.strictEqual(wiped.voice, 1);
  assert.strictEqual(wiped.weekly, 1);
  assert.strictEqual(wiped.bossDmg, 2);
  assert.strictEqual(wiped.poruv, 1);

  // Semua tabel data member kini kosong untuk U1.
  assert.strictEqual(db.prepare('SELECT 1 FROM users WHERE userId = ? AND guildId = ?').get(U1, G), undefined);
  assert.strictEqual(db.prepare('SELECT 1 FROM points WHERE userId = ? AND guildId = ?').get(U1, G), undefined);
  assert.strictEqual(db.prepare('SELECT 1 FROM user_items WHERE userId = ? AND guildId = ?').get(U1, G), undefined);
  assert.strictEqual(db.prepare('SELECT 1 FROM quests WHERE userId = ? AND guildId = ?').get(U1, G), undefined);
  assert.strictEqual(db.prepare('SELECT 1 FROM give_daily WHERE userId = ? AND guildId = ?').get(U1, G), undefined);
  assert.strictEqual(db.prepare('SELECT 1 FROM user_buffs WHERE userId = ? AND guildId = ?').get(U1, G), undefined);
  assert.strictEqual(db.prepare('SELECT 1 FROM voice_sessions WHERE userId = ? AND guildId = ?').get(U1, G), undefined);
  assert.strictEqual(db.prepare('SELECT 1 FROM weekly_points WHERE userId = ? AND guildId = ?').get(U1, G), undefined);
  assert.strictEqual(db.prepare('SELECT 1 FROM boss_damage WHERE userId = ?').get(U1), undefined);
  assert.strictEqual(db.prepare('SELECT 1 FROM poruv_redemptions WHERE userId = ? AND guildId = ?').get(U1, G), undefined);
});

test('resetUser mempertahankan buff guild-wide (*)', () => {
  const row = db.prepare("SELECT * FROM user_buffs WHERE userId = '*' AND guildId = ?").get(G);
  assert.ok(row, 'buff guild-wide harus tetap ada setelah reset');
  assert.strictEqual(row.key, 'xp');
});

test('resetUser tidak menghapus data staff', () => {
  assert.ok(db.prepare('SELECT 1 FROM staff WHERE userId = ? AND guildId = ?').get(U1, G));
  assert.ok(db.prepare('SELECT 1 FROM staff_ratings WHERE staffUserId = ?').get(U1));
  assert.ok(db.prepare('SELECT 1 FROM staff_activity WHERE userId = ? AND guildId = ?').get(U1, G));
});

test('resetUser tidak menyentuh user lain (guild sama & guild lain)', () => {
  // U2 di guild yang sama tetap utuh.
  assert.strictEqual(db.prepare('SELECT balance FROM users WHERE userId = ? AND guildId = ?').get(U2, G).balance, 777);
  assert.strictEqual(db.prepare('SELECT count FROM give_daily WHERE userId = ? AND guildId = ?').get(U2, G).count, 2);
  // U3 di guild lain tetap utuh.
  assert.strictEqual(db.prepare('SELECT balance FROM users WHERE userId = ? AND guildId = ?').get(U3, G2).balance, 888);
  // damage ke boss U2 tidak ikut terhapus (boss_damage difilter userId).
  const boss = db.prepare('SELECT id FROM boss_spawns WHERE guildId = ?').get(G);
  assert.ok(db.prepare('SELECT 1 FROM boss_damage WHERE bossId = ? AND userId = ?').get(boss.id, U2));
});

test('bumpActivity hanya mengubah kolom aktivitas yang diizinkan (whitelist)', () => {
  const { bumpActivity, getActivity } = require('../src/database');
  const before = getActivity(U1, G);
  // field tak dikenal dibuang diam-diam, tidak merusak baris.
  bumpActivity(U1, G, 'not_a_real_column');
  const after = getActivity(U1, G);
  assert.strictEqual(after.messageCount, before.messageCount);
});
