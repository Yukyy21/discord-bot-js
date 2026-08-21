# Changelog

## Restrukturisasi

Perombakan susunan proyek. Tidak ada perubahan perilaku bot bagi pengguna —
semua command, angka, dan isi database tetap sama.

**Struktur**

- Seluruh kode aplikasi pindah ke `src/`; skrip deploy pindah ke `scripts/`.
- `utils/` yang jadi tempat buangan dipecah sesuai perannya: `ui/` (embed,
  pagination, halaman guide), `cards/` (render gambar), `lib/` (logika murni:
  rank, rotasi shop, emoji, path).
- `database.js` yang tadinya satu file besar dipecah jadi `connection.js`,
  `schema.js`, `users.js`, `points.js`, `shop.js`, dan `shopCatalog.js`, dengan
  `index.js` sebagai pintu masuk — pemanggilnya tidak perlu ikut berubah.
- Semua path ke `assets/` dan `data/` lewat `src/lib/paths.js`, jadi tidak ada
  lagi rantai `../../..` yang gampang patah saat file dipindah.

**Kode**

- Angka balancing (rate poin chat & voice, reward daily, kurva level, kurs
  tukar) dikumpulkan di `src/config/constants.js`.
- Rumus level yang tadinya disalin di beberapa command sekarang satu helper
  `xpForLevel()`.
- Loader command dan event ditulis ulang jadi lebih ringkas dan tahan terhadap
  file yang bukan command.
- Komentar dirapikan: yang cuma mengulang isi kode dihapus, yang tersisa
  menjelaskan alasan — mode WAL, reset daily berbasis tanggal kalender, avatar
  GIF yang harus dipaksa PNG, dan batasan token interaksi Discord.

**Dokumentasi**

- Folder `Docs/` baru: `Bot.md`, `Emoji.md`, `ToDo.md`, `Contributor.md`,
  dan berkas ini.
- README dipersingkat jadi sekadar cara menjalankan dan peta folder.
- `.gitignore` diperbaiki supaya `data/` dan file `.env` tidak ikut ter-commit.
