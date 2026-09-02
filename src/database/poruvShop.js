const { db } = require('./connection');
const { getPoints, spendPoints } = require('./points');
const { grantItem, getShopItems } = require('./shop');
const { PORUV_SHOP } = require('../config/constants');
const { getTier, weightedRandom } = require('../lib/tiers');

function getPoruvShopItem(key) {
  return PORUV_SHOP.find(i => i.key === key) || null;
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
 * transaksi. Semua item di sini `fulfillment: 'manual'` — bot tidak
 * menyerahkan barangnya sendiri (Owocash/e-wallet/custom role butuh admin),
 * kecuali item Mythic yang otomatis di-grant ke inventori karena sudah ada
 * di sistem /shop biasa.
 * Mengembalikan { ok, message, redemption } supaya command tinggal menampilkan.
 */
function redeemPoruvItem(userId, guildId, key) {
  const item = getPoruvShopItem(key);
  if (!item) return { ok: false, message: 'Item tidak ditemukan. Cek `/poruv-shop` untuk daftar item.' };

  const stats = getPoints(userId, guildId);
  if (stats.points < item.price) {
    return {
      ok: false,
      message: `Poruv tidak cukup. Butuh **${item.price.toLocaleString()}** Poruv, punyamu **${stats.points.toLocaleString()}**.`,
    };
  }

  let grantedItemName = null;

  const redeem = db.transaction(() => {
    spendPoints(userId, guildId, item.price);

    // Item Mythic langsung digenapi lewat sistem inventori yang sudah ada;
    // sisanya (Owocash, e-wallet, custom role) menunggu admin.
    if (item.key === 'mythic_item') {
      const picked = pickRandomMythicItem();
      if (picked) {
        grantItem(userId, guildId, picked.id);
        grantedItemName = picked.name;
      }
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
  redeem();

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
  const row = db
    .prepare('SELECT * FROM poruv_redemptions WHERE id = ? AND guildId = ?')
    .get(id, guildId);
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
  getPoruvShopItem,
  pickRandomMythicItem,
  redeemPoruvItem,
  getPendingRedemptions,
  resolveRedemption,
};
