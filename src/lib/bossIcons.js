// Ikon gambar mini boss (bukan emoji): file mentah ada di `assets/boss/`,
// nama filenya diambil dari field `icon` di lib/bossCatalog.js.
//
// Discord tidak bisa memuat file lokal lewat URL, jadi tiap kali embed boss
// dikirim / di-edit gambarnya harus ikut dilampirkan sebagai attachment dan
// dirujuk dengan skema `attachment://<nama-file>`.
//
// Semua fungsi di sini aman kalau file ikonnya belum ada: hasilnya `null`
// dan embed boss tetap terkirim, cuma tanpa gambar.
const fs = require('node:fs');
const { AttachmentBuilder } = require('discord.js');
const { getBoss } = require('./bossCatalog');
const { asset } = require('./paths');

/** Path absolut ke file ikon boss, atau null kalau boss/ikonnya tidak ada. */
function bossIconPath(bossKey) {
  const boss = getBoss(bossKey);
  if (!boss?.icon) return null;
  const filePath = asset('boss', boss.icon);
  return fs.existsSync(filePath) ? filePath : null;
}

/**
 * Data lampiran ikon boss.
 * @returns {{ file: AttachmentBuilder, name: string, url: string } | null}
 */
function bossIcon(bossKey) {
  const filePath = bossIconPath(bossKey);
  if (!filePath) return null;
  const boss = getBoss(bossKey);
  const name = `boss-${boss.key}${boss.icon.slice(boss.icon.lastIndexOf('.'))}`;
  return {
    file: new AttachmentBuilder(filePath, { name }),
    name,
    url: `attachment://${name}`,
  };
}

/** Array `files` siap dipakai di channel.send / interaction.update. */
function bossIconFiles(bossKey) {
  const icon = bossIcon(bossKey);
  return icon ? [icon.file] : [];
}

module.exports = { bossIconPath, bossIcon, bossIconFiles };
