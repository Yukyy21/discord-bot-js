// Backup database SQLite ke data/backups/.
//
// Pakai db.backup() bawaan better-sqlite3 (API sqlite3_backup), bukan sekadar
// copy file — aman dipanggil saat bot berjalan karena transaksi yang sedang
// jalan tetap konsisten di berkas hasilan.
//
// Jalankan manual (`npm run backup`) atau dijadwalkan lewat cron / Task
// Scheduler. Retensi diatur BACKUP_KEEP (default 7 salinan terbaru).
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { db } = require('../src/database/connection');
const { DATA_DIR } = require('../src/lib/paths');
const logger = require('../src/lib/logger');

const KEEP = Math.max(1, Number(process.env.BACKUP_KEEP) || 7);
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

async function main() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // ISO tanpa ':' supaya aman sebagai nama file di Windows.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(BACKUP_DIR, `economy-${stamp}.db`);
  await db.backup(dest);
  logger.info(`Backup dibuat: ${dest}`);

  // Buang salinan paling lama biar folder tidak tumbuh tanpa batas. Nama
  // ber-timestamp ISO bisa diurutkan secara alfabetis.
  const copies = fs
    .readdirSync(BACKUP_DIR)
    .filter(name => /^economy-.+\.db$/.test(name))
    .sort()
    .reverse();
  for (const name of copies.slice(KEEP)) {
    fs.unlinkSync(path.join(BACKUP_DIR, name));
    logger.info(`Salinan lama dihapus: ${name}`);
  }
  logger.info(`Selesai. ${Math.min(copies.length, KEEP)} salinan disimpan.`);
}

main().catch(error => {
  logger.error('Backup gagal:', error);
  process.exitCode = 1;
});
