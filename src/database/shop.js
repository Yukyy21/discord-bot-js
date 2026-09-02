const { db } = require('./connection');
const { SHOP_CATALOG, statList, parseEffect, describeEffect } = require('./shopCatalog');
const { getUser, updateBalance } = require('./users');
const { addPoints, addXp } = require('./points');
const { addBuff, consumeCharge } = require('./buffs');
const { runAbility } = require('./abilities');

function getShopItems() {
  return db.prepare('SELECT * FROM shop_items ORDER BY id').all();
}

/** Efek disimpan sebagai JSON supaya tipe efek baru tidak butuh kolom baru. */
function effectToDb(effect) {
  return effect ? JSON.stringify(effect) : null;
}

/** Isi katalog awal sekali saja; kalau tabel sudah ada isinya, dilewati. */
function seedShop() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM shop_items').get().c;
  if (count > 0) return;

  const insert = db.prepare(
    'INSERT INTO shop_items (id, name, price, description, effect) VALUES (?, ?, ?, ?, ?)',
  );
  const seed = db.transaction(() => {
    for (const [id, name, price, description, effect] of SHOP_CATALOG) {
      insert.run(id, name, price, description, effectToDb(effect));
    }
  });
  seed();
}

/**
 * Kolom `effect` sepenuhnya milik katalog di kode: format efek bisa berubah
 * antar versi, jadi baris database disamakan lagi tiap boot. Harga dan
 * deskripsi yang mungkin sudah diubah admin tidak disentuh.
 */
function syncEffects() {
  const update = db.prepare(
    'UPDATE shop_items SET effect = ? WHERE id = ? AND (effect IS NOT ? OR effect IS NULL)',
  );
  const sync = db.transaction(() => {
    for (const [id, , , , effect] of SHOP_CATALOG) {
      const json = effectToDb(effect);
      update.run(json, id, json);
    }
  });
  sync();
}

/** Tambah satu item ke inventori, atau naikkan jumlahnya kalau sudah punya. */
function grantItem(userId, guildId, itemId) {
  db.prepare(
    `
    INSERT INTO user_items (userId, guildId, itemId, quantity) VALUES (?, ?, ?, 1)
    ON CONFLICT(userId, guildId, itemId) DO UPDATE SET quantity = quantity + 1
  `,
  ).run(userId, guildId, itemId);
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

  // price & name dipakai quest spend (nominal belanja) dan UI.
  return {
    ok: true,
    price: item.price,
    name: item.name,
    message: `Berhasil membeli **${item.name}** seharga ${item.price.toLocaleString()} coin!`,
  };
}

function getInventory(userId, guildId) {
  return db
    .prepare(
      `
    SELECT si.id, si.name, si.price, si.description, si.effect, ui.quantity
    FROM user_items ui
    JOIN shop_items si ON si.id = ui.itemId
    WHERE ui.userId = ? AND ui.guildId = ?
    ORDER BY si.name
  `,
    )
    .all(userId, guildId);
}

/**
 * Pakai satu buah item: kurangi inventori dan terapkan efeknya dalam satu
 * transaksi, jadi kegagalan di tengah jalan tidak menghanguskan item.
 * XP dari item sengaja tidak langsung memicu naik level — rekonsiliasi level
 * tetap terjadi di event chat seperti pola yang sudah ada.
 */
function useItem(userId, guildId, itemId) {
  const item = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(itemId);
  if (!item) return { ok: false, message: 'Item tidak ditemukan. Cek `/inventory` untuk daftar item.' };

  const effect = parseEffect(item.effect);
  if (!effect) return { ok: false, message: `**${item.name}** tidak bisa dipakai. Item ini hanya koleksi.` };

  const entry = db
    .prepare('SELECT quantity FROM user_items WHERE userId = ? AND guildId = ? AND itemId = ?')
    .get(userId, guildId, itemId);
  if (!entry || entry.quantity < 1) {
    return { ok: false, message: `Kamu tidak punya **${item.name}**. Beli dulu di \`/shop\`.` };
  }

  // Item yang justru memberi Sturdy tidak boleh dilindungi Sturdy: kalau boleh,
  // ingot kedua dipakai gratis dan charge-nya menumpuk terus (dupe buff).
  const grantsCharge = effect.type === 'ability' && effect.key === 'no_consume';

  let kept = false;
  let abilityNote = null;

  const consume = db.transaction(() => {
    // Sturdy: selama jatahnya ada, item tidak berkurang saat dipakai.
    // Dipanggil di dalam transaksi supaya charge tidak hangus kalau gagal.
    kept = grantsCharge ? false : consumeCharge(userId, guildId, 'no_consume');

    if (!kept && entry.quantity <= 1) {
      db.prepare('DELETE FROM user_items WHERE userId = ? AND guildId = ? AND itemId = ?').run(
        userId,
        guildId,
        itemId,
      );
    } else if (!kept) {
      db.prepare(
        'UPDATE user_items SET quantity = quantity - 1 WHERE userId = ? AND guildId = ? AND itemId = ?',
      ).run(userId, guildId, itemId);
    }

    if (effect.type === 'xp') addXp(userId, guildId, effect.value);
    if (effect.type === 'points') addPoints(userId, guildId, effect.value);
    if (effect.type === 'mult') {
      for (const stat of statList(effect.stat)) {
        addBuff(userId, guildId, { key: stat, value: effect.value, durationMs: effect.durationMs });
      }
    }
    if (effect.type === 'ability') abilityNote = runAbility(userId, guildId, effect);
  });
  consume();

  const info = describeEffect(effect);
  const detail = abilityNote ? `${info.text} — ${abilityNote}` : info.text;
  const keptNote = kept ? ' Item tidak berkurang berkat **Sturdy**.' : '';
  // price ikut dikembalikan supaya /use bisa menghitung rarity untuk quest.
  return {
    ok: true,
    effect,
    name: item.name,
    price: item.price,
    message: `Kamu memakai **${item.name}**. Efek: ${detail}.${keptNote}`,
  };
}

module.exports = { getShopItems, seedShop, syncEffects, grantItem, buyItem, getInventory, useItem };
