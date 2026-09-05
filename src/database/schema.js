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
      lockedMultiplier REAL DEFAULT 1,
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

    -- Buff aktif dari item. Satu baris per pemakaian; buff dengan key sama
    -- tidak dijumlahkan, yang dipakai pengali terbesar (lib/buffs.js).
    -- userId '*' = buff milik seluruh member guild.
    CREATE TABLE IF NOT EXISTS user_buffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      guildId TEXT,
      key TEXT NOT NULL,
      value REAL NOT NULL DEFAULT 1,
      expiresAt INTEGER,
      charges INTEGER
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

    -- Mini boss yang pernah spawn. Baris 'active' dipakai untuk melanjutkan
    -- pertarungan setelah bot restart; baris lama disimpan sebagai riwayat.
    -- Kolom slot = kunci jadwal spawn (YYYY-MM-DDTHH waktu lokal event) supaya satu
    -- jadwal tidak pernah menghasilkan dua boss.
    CREATE TABLE IF NOT EXISTS boss_spawns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      messageId TEXT,
      bossKey TEXT NOT NULL,
      maxHp INTEGER NOT NULL,
      hp INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      slot TEXT,
      spawnedAt INTEGER NOT NULL,
      endsAt INTEGER NOT NULL,
      endedAt INTEGER,
      lastHitUserId TEXT
    );

    -- Kontribusi damage per user pada satu boss. Kolom lastAttackAt sekaligus
    -- menjadi penyimpan cooldown tombol serang (tahan restart).
    CREATE TABLE IF NOT EXISTS boss_damage (
      bossId INTEGER,
      userId TEXT,
      damage INTEGER DEFAULT 0,
      hits INTEGER DEFAULT 0,
      lastAttackAt INTEGER DEFAULT 0,
      PRIMARY KEY (bossId, userId)
    );

    -- Klaim item Poruv Shop (Owocash, custom role, e-wallet, item Mytic).
    -- Semua butuh aksi manual admin, jadi baris ini adalah antrean/riwayat
    -- klaim, bukan langsung tergenapi otomatis seperti item coin biasa.
    CREATE TABLE IF NOT EXISTS poruv_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      guildId TEXT NOT NULL,
      itemKey TEXT NOT NULL,
      itemName TEXT NOT NULL,
      price INTEGER NOT NULL,
      detail TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt INTEGER NOT NULL,
      resolvedAt INTEGER
    );

    -- Konfigurasi per-guild. bossChannelId = channel tempat mini boss spawn
    -- untuk server itu (diatur lewat /boss-channel). Kalau null, bot memakai
    -- fallback BOSS_CHANNEL_ID dari .env.
    CREATE TABLE IF NOT EXISTS guild_config (
      guildId TEXT PRIMARY KEY,
      bossChannelId TEXT,
      updatedAt INTEGER
    );

    -- Pemakaian /give per user per hari (kunci dayKey = YYYY-MM-DD lokal event,
    -- lewat lib/boss localDateKey). Dipakai membatasi jumlah transfer & nominal
    -- harian supaya alt/santet tidak bisa memindah coin tanpa batas. Baris baru
    -- otomatis per hari, reset alami tiap ganti hari.
    CREATE TABLE IF NOT EXISTS give_daily (
      userId TEXT,
      guildId TEXT,
      dayKey TEXT,
      count INTEGER DEFAULT 0,
      totalCoin INTEGER DEFAULT 0,
      PRIMARY KEY (userId, guildId, dayKey)
    );

    -- Daftar staff per-guild, diisi manual lewat /staff-set (bukan dari role
    -- Discord). Divisi bebas teks; deskripsi opsional.
    CREATE TABLE IF NOT EXISTS staff (
      userId TEXT,
      guildId TEXT,
      divisi TEXT NOT NULL,
      deskripsi TEXT,
      addedAt INTEGER NOT NULL,
      addedBy TEXT NOT NULL,
      PRIMARY KEY (userId, guildId)
    );

    -- Rating user ke staff. 1 user cuma boleh memberi 1 rating per staff, jadi
    -- rating ulang = update (INSERT OR REPLACE), bukan baris baru.
    CREATE TABLE IF NOT EXISTS staff_ratings (
      staffUserId TEXT,
      raterUserId TEXT,
      guildId TEXT,
      stars INTEGER NOT NULL,
      comment TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      PRIMARY KEY (staffUserId, raterUserId, guildId)
    );

    -- Aktivitas per staff per bulan (kunci yearMonth YYYY-MM waktu lokal event).
    -- Baris baru per bulan = reset alami tiap ganti bulan, histori tetap ada.
    CREATE TABLE IF NOT EXISTS staff_activity (
      userId TEXT,
      guildId TEXT,
      yearMonth TEXT,
      messageCount INTEGER DEFAULT 0,
      voiceMinutes INTEGER DEFAULT 0,
      tagCount INTEGER DEFAULT 0,
      announcementCount INTEGER DEFAULT 0,
      PRIMARY KEY (userId, guildId, yearMonth)
    );

    CREATE INDEX IF NOT EXISTS idx_boss_active ON boss_spawns (guildId, status);
    CREATE INDEX IF NOT EXISTS idx_boss_slot ON boss_spawns (guildId, slot);
    CREATE INDEX IF NOT EXISTS idx_poruv_status ON poruv_redemptions (guildId, status);

    -- Statistik global bot, satu baris kunci-nilai. Dipakai antara lain buat
    -- hitung total command yang pernah dieksekusi (rotate status), tahan
    -- restart karena disimpan di sini, bukan variabel memori.
    CREATE TABLE IF NOT EXISTS bot_stats (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    );
  `);
}

function columnExists(table, column) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some(c => c.name === column);
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
  // Status equip per item milik user (0/1). Equip bersifat label/carpool untuk
  // kini — efek tetap aktif lewat /use — tapi kolom ini siap untuk mekanik
  // passive bila build equip dibuat benar-benar memengaruhi buff suatu saat.
  ensureColumn('user_items', 'equipped', 'INTEGER DEFAULT 0');
  // Serangan balik boss: kapan terakhir boss mengamuk ke para penyerang.
  ensureColumn('boss_spawns', 'lastRampageAt', 'INTEGER DEFAULT 0');
  // Kunci multiplier saat quest selesai supaya buff tidak bisa ditunda klaim.
  ensureColumn('quests', 'lockedMultiplier', 'REAL DEFAULT 1');
}

module.exports = { createTables, runMigrations };
