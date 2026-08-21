const { db } = require('./connection');

// Tabel dibuat dengan IF NOT EXISTS supaya aman dijalankan tiap start.
// Semua tabel per-guild: primary key selalu mengandung guildId.
function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      userId TEXT,
      guildId TEXT,
      balance INTEGER DEFAULT 0,
      bank INTEGER DEFAULT 0,
      lastDaily TEXT,
      streak INTEGER DEFAULT 0,
      PRIMARY KEY (userId, guildId)
    );

    CREATE TABLE IF NOT EXISTS points (
      userId TEXT,
      guildId TEXT,
      points INTEGER DEFAULT 0,
      pendingWords INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      PRIMARY KEY (userId, guildId)
    );

    CREATE TABLE IF NOT EXISTS shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      price INTEGER NOT NULL,
      description TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS user_items (
      userId TEXT,
      guildId TEXT,
      itemId INTEGER,
      quantity INTEGER DEFAULT 1,
      PRIMARY KEY (userId, guildId, itemId)
    );

    CREATE TABLE IF NOT EXISTS quests (
      userId TEXT,
      guildId TEXT,
      period TEXT,
      questId TEXT,
      target INTEGER NOT NULL,
      reward INTEGER NOT NULL DEFAULT 0,
      progress INTEGER DEFAULT 0,
      claimed INTEGER DEFAULT 0,
      PRIMARY KEY (userId, guildId, period, questId)
    );

    -- Snapshot akumulasi poin per periode (kunci pekan ISO dari lib/quests).
    -- Baris pekan lama sengaja dipertahankan sebagai riwayat.
    CREATE TABLE IF NOT EXISTS weekly_points (
      userId TEXT,
      guildId TEXT,
      period TEXT,
      points INTEGER DEFAULT 0,
      PRIMARY KEY (userId, guildId, period)
    );

    -- Cerminan sesi voice yang sedang berjalan (write-through dari memori).
    -- Kalau bot mati di tengah sesi, waktu mulai bisa dilanjutkan saat boot.
    CREATE TABLE IF NOT EXISTS voice_sessions (
      userId TEXT,
      guildId TEXT,
      joinedAt INTEGER NOT NULL,
      lastGrant INTEGER NOT NULL,
      eligible INTEGER DEFAULT 0,
      PRIMARY KEY (userId, guildId)
    );
  `);
}

function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
}

function ensureColumn(table, column, definition) {
  if (!columnExists(table, column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

// Kolom yang ditambahkan setelah tabel awal dibuat. Database lama tidak punya
// kolom ini, jadi ditambal di sini alih-alih pakai file migrasi terpisah.
function runMigrations() {
  ensureColumn('users', 'streak', 'INTEGER DEFAULT 0');
  ensureColumn('points', 'xp', 'INTEGER DEFAULT 0');
  ensureColumn('points', 'level', 'INTEGER DEFAULT 1');
  ensureColumn('points', 'voice_seconds', 'INTEGER DEFAULT 0');
  ensureColumn('shop_items', 'effect', 'TEXT');
}

module.exports = { createTables, runMigrations };
