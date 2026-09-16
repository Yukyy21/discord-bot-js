const { db } = require('./connection');
const { getPoints, spendPoints } = require('./points');
const { grantItem, getShopItems } = require('./shop');
const { PORUV_SHOP } = require('../config/constants');
const { getTier, weightedRandom } = require('../lib/tiers');

/**
 * Item /poruv-shop guild ini. Kosong (belum pernah di-/poruv-shop-set) =
 * masih pakai default bawaan (config/constants.js), TIDAK menulis apa pun ke
 * DB — biar baca katalog tetap ringan buat guild yang tidak pernah mengubah.
 */
function getPoruvShopItems(guildId) {
  const rows = db
    .prepare('SELECT * FROM poruv_shop_items WHERE guildId = ? ORDER BY sortOrder, createdAt')
    .all(guildId);
  return rows.length ? rows : PORUV_SHOP;
}

function getPoruvShopItem(guildId, key) {
  return getPoruvShopItems(guildId).find(i => i.key === key) || null;
}

/**
 * Begitu admin pertama kali mengubah katalog guild ini, seluruh default
 * disalin dulu ke tabel poruv_shop_items supaya item bawaan (Owocash, dst)
 * ikut bisa diedit/dihapus, bukan cuma item baru yang bisa diatur.
 */
function ensureSeeded(guildId) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM poruv_shop_items WHERE guildId = ?').get(guildId).c;
  if (count > 0) return;
  const insert = db.prepare(
    `INSERT INTO poruv_shop_items (guildId, key, name, emoji, price, description, fulfillment, sortOrder, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const seed = db.transaction(() => {
    PORUV_SHOP.forEach((item, index) => {
      insert.run(guildId, item.key, item.name, item.emoji, item.price, item.description, item.fulfillment, index, Date.now());
    });
  });
  seed();
}

/** Slug key dari nama item, dijamin unik per guild (tambah angka kalau bentrok). */
function slugKey(guildId, name) {
  const base =
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'item';
  let key = base;
  let i = 2;
  while (db.prepare('SELECT 1 FROM poruv_shop_items WHERE guildId = ? AND key = ?').get(guildId, key)) {
    key = `${base}_${i}`;
    i += 1;
  }
  return key;
}

/** Tambah item baru ke katalog /poruv-shop guild ini. Mengembalikan key-nya. */
function addPoruvShopItem(guildId, { name, emoji, price, description = '', fulfillment = 'manual' }) {
  ensureSeeded(guildId);
  const key = slugKey(guildId, name);
  const maxOrder = db
    .prepare('SELECT COALESCE(MAX(sortOrder), -1) AS m FROM poruv_shop_items WHERE guildId = ?')
    .get(guildId).m;
  db.prepare(
    `INSERT INTO poruv_shop_items (guildId, key, name, emoji, price, description, fulfillment, sortOrder, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(guildId, key, name, emoji, price, description, fulfillment, maxOrder + 1, Date.now());
  return key;
}

/** Ubah sebagian field item yang sudah ada. Field yang tidak dikirim tidak disentuh. */
function editPoruvShopItem(guildId, key, patch) {
  ensureSeeded(guildId);
  const existing = db.prepare('SELECT * FROM poruv_shop_items WHERE guildId = ? AND key = ?').get(guildId, key);
  if (!existing) {
    return { ok: false, message: `Item dengan key \`${key}\` tidak ditemukan. Cek /poruv-shop-set list.` };
  }

  const next = {
    name: patch.name ?? existing.name,
    emoji: patch.emoji ?? existing.emoji,
    price: patch.price ?? existing.price,
    description: patch.description ?? existing.description,
    fulfillment: patch.fulfillment ?? existing.fulfillment,
  };
  db.prepare(
    'UPDATE poruv_shop_items SET name = ?, emoji = ?, price = ?, description = ?, fulfillment = ? WHERE guildId = ? AND key = ?',
  ).run(next.name, next.emoji, next.price, next.description, next.fulfillment, guildId, key);
  return { ok: true, item: { ...existing, ...next } };
}

function removePoruvShopItem(guildId, key) {
  ensureSeeded(guildId);
  const result = db.prepare('DELETE FROM poruv_shop_items WHERE guildId = ? AND key = ?').run(guildId, key);
  return result.changes > 0;
}

/** Ambil satu item Mythic acak dari katalog /shop coin biasa (bukan stok, seluruh katalog). */
function pickRandomMythicItem() {
  const mythics = getShopItems()
    .map(item => ({ ...item, tier: getTier(item.price, item.name) }))
    .filter(item => item.tier === 'Mythic');
  if (!mythics.length) return null;
  const [picked] = weightedRandom(mythics, 1);
  return picked || null;
}

/**
 * Redeem satu item Poruv Shop: potong Poruv dan catat klaim dalam satu
 * transaksi. `fulfillment: 'manual'` butuh admin (Owocash/e-wallet/custom
 * role/dll); `fulfillment: 'mythic_random'` langsung digenapi otomatis lewat
 * /inventory (1 item Mythic acak dari katalog /shop).
 * Mengembalikan { ok, message, redemption } supaya command tinggal menampilkan.
 */
function redeemPoruvItem(userId, guildId, key) {
  const item = getPoruvShopItem(guildId, key);
  if (!item) return { ok: false, message: 'Item tidak ditemukan. Cek `/poruv-shop` untuk daftar item.' };

  const stats = getPoints(userId, guildId);
  if (stats.points < item.price) {
    return {
      ok: false,
      message: `Poruv tidak cukup. Butuh **${item.price.toLocaleString()}** Poruv, punyamu **${stats.points.toLocaleString()}**.`,
    };
  }

  let grantedItemName = null;
  const isMythicRandom = item.fulfillment === 'mythic_random';

  const NO_MYTHIC = new Error('Tidak ada item Mythic di katalog');

  const redeem = db.transaction(() => {
    // Item Mythic dipilih dulu sebelum Poruv dipotong. Kalau katalog kosong,
    // transaksi dibatalkan dengan melempar error di bawah — user TIDAK
    // diancap Poruv-nya tanpa mendapat barang (Gelombang Empat Belas).
    let picked = null;
    if (isMythicRandom) {
      picked = pickRandomMythicItem();
      if (!picked) throw NO_MYTHIC;
    }

    spendPoints(userId, guildId, item.price);

    if (isMythicRandom) {
      grantItem(userId, guildId, picked.id);
      grantedItemName = picked.name;
    }

    db.prepare(
      `INSERT INTO poruv_redemptions (userId, guildId, itemKey, itemName, price, detail, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      userId,
      guildId,
      item.key,
      item.name,
      item.price,
      grantedItemName,
      grantedItemName ? 'fulfilled' : 'pending',
      Date.now(),
    );
  });

  try {
    redeem();
  } catch (err) {
    if (err === NO_MYTHIC) {
      return { ok: false, message: 'Item Mythic sedang kosong di katalog. Coba lagi nanti.' };
    }
    throw err;
  }

  const redemption = db
    .prepare('SELECT * FROM poruv_redemptions WHERE userId = ? AND guildId = ? ORDER BY id DESC LIMIT 1')
    .get(userId, guildId);

  return {
    ok: true,
    item,
    grantedItemName,
    redemption,
    message: grantedItemName
      ? `Berhasil menukar **${item.name}** — dapat **${grantedItemName}**, langsung masuk \`/inventory\`.`
      : `Berhasil menukar **${item.name}**. Klaim masuk antrean, admin akan segera memprosesnya.`,
  };
}

function getPendingRedemptions(guildId, limit = 20) {
  return db
    .prepare('SELECT * FROM poruv_redemptions WHERE guildId = ? AND status = ? ORDER BY createdAt ASC LIMIT ?')
    .all(guildId, 'pending', limit);
}

function resolveRedemption(id, guildId) {
  const row = db.prepare('SELECT * FROM poruv_redemptions WHERE id = ? AND guildId = ?').get(id, guildId);
  if (!row) return { ok: false, message: 'Klaim tidak ditemukan.' };
  if (row.status !== 'pending') return { ok: false, message: `Klaim ini sudah berstatus **${row.status}**.` };

  db.prepare('UPDATE poruv_redemptions SET status = ?, resolvedAt = ? WHERE id = ?').run(
    'fulfilled',
    Date.now(),
    id,
  );
  return { ok: true, row };
}

module.exports = {
  getPoruvShopItems,
  getPoruvShopItem,
  addPoruvShopItem,
  editPoruvShopItem,
  removePoruvShopItem,
  pickRandomMythicItem,
  redeemPoruvItem,
  getPendingRedemptions,
  resolveRedemption,
};
