# Changelog

## Command Admin

Command `/admin` baru dengan tiga subcommand, terkunci ke izin Administrator
Discord (bisa dibuka per-role oleh pemilik server lewat pengaturan
integrasi):

- `/admin give-coin <user> <jumlah>` — beri coin untuk event/hadiah.
- `/admin reset-user <user> <konfirmasi>` — hapus seluruh data user di guild
  (saldo/bank/streak, poin/level/XP, inventori, quest) dalam satu transaksi;
  wajib mengisi `konfirmasi: true`.
- `/admin set-level <user> <level>` — atur level manual; XP di-reset ke 0 di
  level baru.

Modul database `src/database/admin.js` menampung SQL reset; semua aksi admin
tercatat di log konsol dengan awalan `[Admin]`.

## Filter & Pencarian di /shop

`/shop` kini punya dua opsi opsional: `tier:` (pilihan Common–Mythic) dan
`cari:` (potongan nama, tidak peduli huruf besar-kecil).

- Keduanya bisa dipakai bersamaan; embed menampilkan baris "Filter aktif"
  beserta jumlah item yang cocok, atau pesan kosong yang jelas.
- Tombol halaman tetap bekerja dengan filter aktif: state filter ikut
  tersimpan di customId (`shop_page:<tier>:<kata kunci>:<halaman>`), jadi
  tetap stateless dan tahan restart. Tombol dari format lama tetap didukung.
- Kata kunci dibersihkan dari karakter `:` dan dipatok 40 karakter agar
  customId tidak meluap.

## Quest Harian & Mingguan

Command `/quest`: tiap user dapat 2 quest harian + 1 quest mingguan yang
diundi dari katalog (`src/lib/quests.js`), dengan reward coin yang diklaim
lewat tombol.

- Quest baru ditugaskan malas — dibuat saat pertama kali disentuh di periode
  itu, jadi user pasif tidak menyisakan data. Periode harian pakai tanggal
  UTC, mingguan pakai nomor pekan ISO.
- Progres otomatis dari aktivitas yang sudah ada: pesan chat (lolos
  anti-spam), detik voice saat sesi berakhir, klaim `/daily`, `/use`, `/buy`,
  dan `/give`. Progres dipatok di target.
- Tabel `quests` baru; target & reward disimpan per baris supaya perubahan
  katalog tidak mengubah quest yang sedang berjalan.
- Tombol klaim stateless (`quest_claim:pemilik:periode:quest`) dan hanya
  bisa ditekan pemiliknya.

## Bank Bisa Diisi

Command `/bank` dengan dua subcommand: `deposit` (dompet → bank) dan
`withdraw` (bank → dompet). Kolom `bank` di tabel users sebenarnya sudah ada
sejak awal, kini akhirnya terpakai. Validasi kecukupan saldo di command,
mutasi dua kolom di `src/database/users.js`.

## Backup Database

`npm run backup` (`scripts/backup-db.js`) menyalin `data/economy.db` ke
`data/backups/economy-<timestamp>.db`.

- Memakai `db.backup()` bawaan better-sqlite3, jadi aman dipanggil saat bot
  sedang berjalan — hasilnya konsisten walau ada transaksi berjalan.
- Retensi default 7 salinan terbaru, bisa diubah lewat variabel `BACKUP_KEEP`.
- Cocok dijadwalkan lewat cron / Task Scheduler.

## Poin Voice Butuh Teman

Duduk sendirian atau di AFK channel tidak lagi menghasilkan poin.

- Syarat layak: channel berisi minimal 2 manusia yang tidak deaf (termasuk
  yang bersangkutan) dan bukan AFK channel. Angkanya di
  `VOICE.MIN_LISTENERS` (`src/config/constants.js`).
- Kelayakan dievaluasi ulang di setiap perubahan voice state — join, keluar,
  pindah, deafen — karena satu peristiwa bisa mengubah nasib orang lain di
  channel yang sama.
- Saat kehilangan kelayakan, sisa masa layak dibayar seketika lalu jam poin
  direset; waktu tidak layak tidak pernah menumpuk jadi utang poin.
- Leaderboard jam voice tetap mencatat semua durasi, termasuk saat sendirian.

## Anti-Spam Poin Chat

Mengirim kata berulang-ulang tidak lagi menghasilkan poin.

- Pesan dalam jarak kurang dari 3 detik sejak pesan sebelumnya diabaikan
  (cooldown per user per server).
- Isi yang sama persis dengan pesan sebelumnya dalam 30 detik juga diabaikan;
  pesan spam tidak mendapat apa pun: tanpa poin, XP, maupun akumulasi
  `pendingWords`. Angka aturan ada di `CHAT.ANTISPAM_COOLDOWN_MS` dan
  `CHAT.DUPLICATE_WINDOW_MS` (`src/config/constants.js`).
- Logika diekstrak ke `src/lib/antispam.js` dengan jejak memori terbatas
  (maksimum 1000 user terlacak).

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
