# Changelog

## Anti-Spam Poin Chat

Mengirim kata berulang-ulang tidak lagi menghasilkan poin.

- Pesan dalam jarak kurang dari 3 detik sejak pesan sebelumnya diabaikan
  (cooldown per user per server).
- Isi yang sama dengan pesan sebelumnya dalam 5 menit juga diabaikan;
  perbandingan tidak peduli huruf besar/kecil.
- Pesan spam tidak mendapat apa pun: tanpa poin, XP, maupun akumulasi
  `pendingWords`. Angka aturan ada di `CHAT.COOLDOWN_MS` dan
  `CHAT.DUPLICATE_WINDOW_MS` (`src/config/constants.js`).

## Item Bisa Dipakai

Fitur `/use` — item dengan efek kini punya fungsi, tidak lagi sekadar numpuk di
`/inventory`.

- Kolom `effect` (JSON) baru di tabel `shop_items`, ditambal `ensureColumn()`
  dan di-backfill dari katalog untuk database lama.
- Sepuluh item jadi consumable (Slime Gel, Tattered Parchment, Glowing
  Mushroom, Beast Fang, Stardust Core, Tears of the Fallen, Holy Grail
  Fragment, Astral Fragment, Heart of the Primordial, Chrono Core) — efeknya
  XP atau poin. Sisanya tetap koleksi.
- Command baru `/use <id>`: memakai satu buah item; pengurangan stok dan
  pemberian efek dalam satu transaksi SQLite.
- `/shop` dan `/inventory` kini menampilkan teks efek item yang bisa dipakai.

## Perbaikan

- Loader command (`src/index.js` dan `scripts/deploy-commands.js`) crash dengan
  `ENOTDIR` kalau `src/commands/` berisi file biasa seperti penjaga git
  `.nekokeep`. Sekarang hanya folder yang dipindai.

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
