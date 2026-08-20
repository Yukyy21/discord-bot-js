const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'economy.db'));

db.pragma('journal_mode = WAL');

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
`);

function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
}

function ensureColumn(table, column, definition) {
  if (!columnExists(table, column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

ensureColumn('users', 'streak', 'INTEGER DEFAULT 0');
ensureColumn('points', 'xp', 'INTEGER DEFAULT 0');
ensureColumn('points', 'level', 'INTEGER DEFAULT 1');
ensureColumn('points', 'voice_seconds', 'INTEGER DEFAULT 0');

function getUser(userId, guildId) {
  let user = db.prepare('SELECT * FROM users WHERE userId = ? AND guildId = ?').get(userId, guildId);
  if (!user) {
    db.prepare('INSERT INTO users (userId, guildId) VALUES (?, ?)').run(userId, guildId);
    user = db.prepare('SELECT * FROM users WHERE userId = ? AND guildId = ?').get(userId, guildId);
  }
  return user;
}

function updateBalance(userId, guildId, amount) {
  getUser(userId, guildId);
  db.prepare('UPDATE users SET balance = balance + ? WHERE userId = ? AND guildId = ?').run(amount, userId, guildId);
}

function getPoints(userId, guildId) {
  let row = db.prepare('SELECT * FROM points WHERE userId = ? AND guildId = ?').get(userId, guildId);
  if (!row) {
    db.prepare('INSERT INTO points (userId, guildId) VALUES (?, ?)').run(userId, guildId);
    row = db.prepare('SELECT * FROM points WHERE userId = ? AND guildId = ?').get(userId, guildId);
  }
  return row;
}

function addPoints(userId, guildId, amount) {
  getPoints(userId, guildId);
  db.prepare('UPDATE points SET points = points + ? WHERE userId = ? AND guildId = ?').run(amount, userId, guildId);
}

function addXp(userId, guildId, amount) {
  getPoints(userId, guildId);
  db.prepare('UPDATE points SET xp = xp + ? WHERE userId = ? AND guildId = ?').run(amount, userId, guildId);
}

function getProfile(userId, guildId) {
  const user = getUser(userId, guildId);
  const points = getPoints(userId, guildId);
  return { ...user, points: points.points, xp: points.xp, level: points.level, voice_seconds: points.voice_seconds || 0 };
}

function addVoiceSeconds(userId, guildId, seconds) {
  getPoints(userId, guildId);
  db.prepare('UPDATE points SET voice_seconds = voice_seconds + ? WHERE userId = ? AND guildId = ?').run(seconds, userId, guildId);
}

function getVoiceHoursLeaderboard(guildId, limit = 10) {
  return db.prepare('SELECT * FROM points WHERE guildId = ? ORDER BY voice_seconds DESC LIMIT ?').all(guildId, limit);
}

function getBalanceLeaderboard(guildId, limit = 10) {
  return db.prepare('SELECT * FROM users WHERE guildId = ? ORDER BY balance DESC LIMIT ?').all(guildId, limit);
}

function getPointsLeaderboard(guildId, limit = 10) {
  return db.prepare('SELECT * FROM points WHERE guildId = ? ORDER BY points DESC LIMIT ?').all(guildId, limit);
}

function getLevelLeaderboard(guildId, limit = 10) {
  return db.prepare('SELECT * FROM points WHERE guildId = ? ORDER BY level DESC, xp DESC LIMIT ?').all(guildId, limit);
}

function getXpRank(userId, guildId) {
  const row = db.prepare('SELECT * FROM points WHERE userId = ? AND guildId = ?').get(userId, guildId);
  if (!row) return null;
  const above = db.prepare(
    'SELECT COUNT(*) AS c FROM points WHERE guildId = ? AND (level > ? OR (level = ? AND xp > ?))'
  ).get(guildId, row.level, row.level, row.xp);
  return above.c + 1;
}

function getShopItems() {
  return db.prepare('SELECT * FROM shop_items ORDER BY id').all();
}

function seedShop() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM shop_items').get().c;
  if (count > 0) return;
  const ins = db.prepare('INSERT INTO shop_items (id, name, price, description) VALUES (?, ?, ?, ?)');
  const items = [
    [1, 'Rusty Shortsword', 1200, 'Pedang pendek peninggalan prajurit yang sudah berkarat'],
    [2, 'Apprentice Wand', 1500, 'Tongkat sihir kayu biasa yang sering dipakai pemula'],
    [3, 'Iron Ore', 800, 'Bijih besi mentah yang belum diolah'],
    [4, 'Slime Gel', 600, 'Lendir lengket yang dijatuhkan oleh monster tingkat rendah'],
    [5, 'Tattered Parchment', 500, 'Gulungan kertas usang yang tulisannya sudah hampir pudar'],
    [6, 'Steel Broadsword', 6500, 'Pedang baja kokoh dengan daya tebas yang mantap'],
    [7, "Ranger's Bow", 5500, 'Busur andalan para pemburu untuk menyerang dari jauh'],
    [8, 'Silver Ingot', 4000, 'Batangan perak murni yang sudah dilebur sempurna'],
    [9, 'Glowing Mushroom', 3500, 'Jamur beracun yang memancarkan cahaya di tempat gelap'],
    [10, 'Beast Fang', 3000, 'Taring tajam utuh dari monster buas di hutan'],
    [11, 'Plasma Blaster', 18000, 'Senjata api berenergi plasma dengan akurasi tinggi'],
    [12, 'Crystal Dagger', 15000, 'Belati tajam yang terbuat dari pecahan kristal es abadi'],
    [13, 'Stardust Core', 12000, 'Inti energi murni yang jatuh dari bongkahan bintang'],
    [14, 'Dragon Scale', 10000, 'Sisik naga pelindung yang sangat keras dan tahan api'],
    [15, 'Quantum Chip', 8500, 'Komponen cybernetic canggih peninggalan teknologi masa lalu'],
    [16, 'Blade of Desolation', 48000, 'Pedang besar yang memancarkan aura kegelapan dan keputusasaan'],
    [17, 'Void Scepter', 42000, 'Tongkat penyihir yang mampu memanipulasi gravitasi di sekitarnya'],
    [18, 'Meteorite Alloy', 35000, 'Logam super kuat hasil tempaan batu meteor dari luar angkasa'],
    [19, 'Abyssal Eye', 28000, 'Mata monster raksasa yang diambil dari dasar jurang terdalam'],
    [20, 'Tears of the Fallen', 22000, 'Kristal ajaib yang terbentuk dari air mata dewa yang gugur'],
    [21, 'Blade of the Fallen King', 55000, 'Pedang peninggalan raja lalim yang ditakuti, masih memancarkan aura intimidasi'],
    [22, 'Phoenix Whisper Bow', 50000, 'Busur yang terbuat dari bulu burung Phoenix, anak panahnya meledak menjadi api abadi'],
    [23, 'Adamantine Ingot', 45000, 'Balok logam terkeras di dunia yang tidak bisa dilebur dengan api biasa'],
    [24, "Leviathan's Scale", 42000, 'Sisik raksasa dari monster penguasa lautan terdalam, kebal terhadap segala sihir elemen air'],
    [25, 'Holy Grail Fragment', 38000, 'Pecahan cawan suci yang memancarkan cahaya kehidupan, sering dicari untuk ritual penyembuhan absolut'],
    [26, 'Starbreaker Claymore', 120000, 'Pedang raksasa bersinar yang menyerap energi rasi bintang; konon tebasannya mampu membelah planet'],
    [27, 'Genesis Scepter', 110000, 'Tongkat penciptaan yang memegang rahasia awal mula alam semesta, mampu memanipulasi gravitasi'],
    [28, 'Astral Fragment', 90000, 'Pecahan murni dari dimensi bintang-bintang yang menjadi fondasi pembentuk realitas dan ruang angkasa'],
    [29, 'Heart of the Primordial', 80000, 'Jantung dari entitas pertama di alam semesta yang masih berdetak, menghasilkan energi tanpa batas'],
    [30, 'Chrono Core', 70000, 'Inti mesin waktu kuno yang melayang dan terus berputar, mampu memperlambat waktu di sekitarnya'],
  ];
  const seed = db.transaction(() => items.forEach(([id, name, price, desc]) => ins.run(id, name, price, desc)));
  seed();
}

function buyItem(userId, guildId, itemId) {
  const item = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(itemId);
  if (!item) return { ok: false, message: 'Item tidak ditemukan. Cek `/shop` untuk daftar item.' };
  const user = getUser(userId, guildId);
  if (user.balance < item.price) {
    return { ok: false, message: `Saldo tidak cukup. Butuh ${item.price.toLocaleString()} coin, punyamu ${user.balance.toLocaleString()}.` };
  }
  const buy = db.transaction(() => {
    updateBalance(userId, guildId, -item.price);
    db.prepare(`
      INSERT INTO user_items (userId, guildId, itemId, quantity) VALUES (?, ?, ?, 1)
      ON CONFLICT(userId, guildId, itemId) DO UPDATE SET quantity = quantity + 1
    `).run(userId, guildId, itemId);
  });
  buy();
  return { ok: true, message: `Berhasil membeli **${item.name}** seharga ${item.price.toLocaleString()} coin!` };
}

function getInventory(userId, guildId) {
  return db.prepare(`
    SELECT si.name, si.description, ui.quantity
    FROM user_items ui
    JOIN shop_items si ON si.id = ui.itemId
    WHERE ui.userId = ? AND ui.guildId = ?
    ORDER BY si.name
  `).all(userId, guildId);
}

seedShop();

module.exports = {
  db,
  getUser,
  updateBalance,
  getPoints,
  addPoints,
  addXp,
  addVoiceSeconds,
  getProfile,
  getBalanceLeaderboard,
  getPointsLeaderboard,
  getVoiceHoursLeaderboard,
  getLevelLeaderboard,
  getXpRank,
  getShopItems,
  buyItem,
  getInventory,
};