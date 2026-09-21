// Daftarin font kita sendiri (assets/fonts/) ke @napi-rs/canvas, SEKALI di
// awal proses — biar semua kartu (profile, rank, leaderboard, staff, dst)
// tampilannya konsisten di device mana pun bot di-host, bukan gambling ke
// font default sistem (yang di beberapa host, mis. Termux, seringnya jelek
// atau malah gak lengkap glyph-nya).
//
// Tiap keluarga font didaftarin 3x (Regular/SemiBold-Medium/Bold) di bawah
// NAMA FAMILY YANG SAMA — @napi-rs/canvas otomatis milih file yang tepat
// berdasarkan keyword 'bold'/berat angka di ctx.font, sama seperti CSS.
const fs = require('node:fs');
const { GlobalFonts } = require('@napi-rs/canvas');
const { asset } = require('./paths');
const logger = require('./logger');

// display = judul/nama/angka besar (karakter Space Grotesk agak geometris/
// techy, cocok buat nuansa game/economy bot ini).
// body = teks isi/label/deskripsi (Inter, paling nyaman dibaca di ukuran kecil).
// alt = cadangan/varian lain kalau suatu saat perlu differensiasi ketiga.
const FONT = { display: 'Nekomaru Display', body: 'Nekomaru Body', alt: 'Nekomaru Alt' };

const FILES = [
  ['SpaceGrotesk-Regular.ttf', FONT.display],
  ['SpaceGrotesk-Medium.ttf', FONT.display],
  ['SpaceGrotesk-Bold.ttf', FONT.display],
  ['Inter_18pt-Regular.ttf', FONT.body],
  ['Inter_18pt-SemiBold.ttf', FONT.body],
  ['Inter_18pt-Bold.ttf', FONT.body],
  ['manrope-regular.otf', FONT.alt],
  ['manrope-semibold.otf', FONT.alt],
  ['manrope-bold.otf', FONT.alt],
];

let registered = false;

/** Idempotent — aman dipanggil dari banyak file kartu, cuma jalan sekali. */
function registerFonts() {
  if (registered) return;
  registered = true;
  for (const [file, family] of FILES) {
    const p = asset('fonts', file);
    if (!fs.existsSync(p)) {
      logger.error(`Font tidak ditemukan, dilewati: ${file}`);
      continue;
    }
    try {
      GlobalFonts.registerFromPath(p, family);
    } catch (error) {
      logger.error(`Gagal register font ${file}:`, error.message);
    }
  }
}

registerFonts();

module.exports = { FONT, registerFonts };
