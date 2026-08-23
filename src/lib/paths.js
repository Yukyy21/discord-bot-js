// Semua path ke folder di luar `src/` lewat sini, biar kalau struktur folder
// digeser cukup satu file yang diubah.
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

const ASSETS_DIR = path.join(ROOT, 'assets');
const DATA_DIR = path.join(ROOT, 'data');
const AVATAR_CACHE_DIR = path.join(DATA_DIR, 'avatar-cache');

/** Path ke file di dalam assets/, contoh: asset('ranks', 'Demigod.png'). */
function asset(...segments) {
  return path.join(ASSETS_DIR, ...segments);
}

module.exports = { ROOT, ASSETS_DIR, DATA_DIR, AVATAR_CACHE_DIR, asset };
