const { db } = require('./connection');
const { SHOP_CATALOG } = require('./shopCatalog');
const { getUser, updateBalance } = require('./users');

function getShopItems() {
  return db.prepare('SELECT * FROM shop_items ORDER BY id').all();
}

/** Isi katalog awal sekali saja; kalau tabel sudah ada isinya, dilewati. */
function seedShop() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM shop_items').get().c;
  if (count > 0) return;

  const insert = db.prepare('INSERT INTO shop_items (id, name, price, description) VALUES (?, ?, ?, ?)');
  const seed = db.transaction(() => {
    for (const [id, name, price, description] of SHOP_CATALOG) insert.run(id, name, price, description);
  });
  seed();
}

/** Tambah satu item ke inventori, atau naikkan jumlahnya kalau sudah punya. */
function grantItem(userId, guildId, itemId) {
  db.prepare(`
    INSERT INTO user_items (userId, guildId, itemId, quantity) VALUES (?, ?, ?, 1)
    ON CONFLICT(userId, guildId, itemId) DO UPDATE SET quantity = quantity + 1
  `).run(userId, guildId, itemId);
}

/**
 * Beli item: potong saldo dan tambah inventori dalam satu transaksi.
 * Mengembalikan `{ ok, message }` supaya command tinggal menampilkan pesannya.
 */
function buyItem(userId, guildId, itemId) {
  const item = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(itemId);
  if (!item) return { ok: false, message: 'Item tidak ditemukan. Cek `/shop` untuk daftar item.' };

  const user = getUser(userId, guildId);
  if (user.balance < item.price) {
    return {
      ok: false,
      message: `Saldo tidak cukup. Butuh ${item.price.toLocaleString()} coin, punyamu ${user.balance.toLocaleString()}.`,
    };
  }

  const buy = db.transaction(() => {
    updateBalance(userId, guildId, -item.price);
    grantItem(userId, guildId, itemId);
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

module.exports = { getShopItems, seedShop, grantItem, buyItem, getInventory };
