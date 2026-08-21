const { db } = require('./connection');

/** Ambil baris user; dibuat dulu kalau memang belum pernah tercatat. */
function getUser(userId, guildId) {
  let user = db.prepare('SELECT * FROM users WHERE userId = ? AND guildId = ?').get(userId, guildId);
  if (!user) {
    db.prepare('INSERT INTO users (userId, guildId) VALUES (?, ?)').run(userId, guildId);
    user = db.prepare('SELECT * FROM users WHERE userId = ? AND guildId = ?').get(userId, guildId);
  }
  return user;
}

/** Tambah (atau kurangi, kalau amount negatif) saldo dompet. */
function updateBalance(userId, guildId, amount) {
  getUser(userId, guildId);
  db.prepare('UPDATE users SET balance = balance + ? WHERE userId = ? AND guildId = ?')
    .run(amount, userId, guildId);
}

/** Catat klaim daily: saldo, streak, dan tanggal klaim dalam satu transaksi. */
function claimDaily(userId, guildId, { reward, streak, dateKey }) {
  const apply = db.transaction(() => {
    updateBalance(userId, guildId, reward);
    db.prepare('UPDATE users SET streak = ?, lastDaily = ? WHERE userId = ? AND guildId = ?')
      .run(streak, dateKey, userId, guildId);
  });
  apply();
}

/** Pindah coin antar user. Saldo pengirim wajib dicek lebih dulu oleh pemanggil. */
function transferCoins(fromId, toId, guildId, amount) {
  const transfer = db.transaction(() => {
    getUser(toId, guildId);
    db.prepare('UPDATE users SET balance = balance - ? WHERE userId = ? AND guildId = ?').run(amount, fromId, guildId);
    db.prepare('UPDATE users SET balance = balance + ? WHERE userId = ? AND guildId = ?').run(amount, toId, guildId);
  });
  transfer();
}

/** Dompet -> bank. Isi dompet wajib dicek lebih dulu oleh pemanggil. */
function depositToBank(userId, guildId, amount) {
  getUser(userId, guildId);
  db.prepare('UPDATE users SET balance = balance - ?, bank = bank + ? WHERE userId = ? AND guildId = ?')
    .run(amount, amount, userId, guildId);
}

/** Bank -> dompet. Isi bank wajib dicek lebih dulu oleh pemanggil. */
function withdrawFromBank(userId, guildId, amount) {
  getUser(userId, guildId);
  db.prepare('UPDATE users SET bank = bank - ?, balance = balance + ? WHERE userId = ? AND guildId = ?')
    .run(amount, amount, userId, guildId);
}

function getBalanceLeaderboard(guildId, limit = 10) {
  return db.prepare('SELECT * FROM users WHERE guildId = ? ORDER BY balance DESC LIMIT ?').all(guildId, limit);
}

module.exports = {
  getUser,
  updateBalance,
  claimDaily,
  transferCoins,
  depositToBank,
  withdrawFromBank,
  getBalanceLeaderboard,
};
