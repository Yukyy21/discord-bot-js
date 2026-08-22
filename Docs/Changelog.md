# Changelog

## Isi /guide Dirombak + ToDo v2

- `/guide` sekarang punya **11 halaman** (dari 7) dan isinya disamakan dengan
  perilaku kode yang sebenarnya: halaman baru **Quest**, **Item & Rarity**,
  **Utilitas**, dan **Admin**.
- Angka-angka nyata masuk ke panduan: 7 kata = 2 poin, 1 XP/kata dengan batas
  20 XP per pesan, cooldown anti-spam 3 detik, jendela duplikat 30 detik,
  voice 15 menit = 5 poin dengan syarat minimal 2 pendengar dan bukan AFK
  channel, daily 500 + 100 x streak, kurs 500 coin = 1 poin, dan rumus level
  (level x 100 XP).
- Halaman **Ekonomi** melengkapi opsi `/shop tier:` dan `/shop cari:`, serta
  `/bank deposit|withdraw`.
- Halaman **Poin & Level** memuat seluruh subcommand leaderboard, termasuk
  `rank` dan `mingguan` yang sebelumnya tidak disebut sama sekali.
- Halaman **Reward** menyebut peluang item random naik level (10% + 1% per
  level, maksimal 50%) dan XP berlebih yang bisa melompati beberapa level.
- Halaman **Quest** menjelaskan undian 2 harian + 1 mingguan, hadiah tiap
  misi, dan bahwa progres tercatat otomatis.
- Halaman **Item & Rarity** menjelaskan bobot undian tier
  (Common 30 sampai Mythic 5) dan beda item berefek vs item koleksi.
- Halaman **Admin** mendokumentasikan tiga subcommand `/admin` beserta
  syarat izin Administrator.
- Dokumentasi: `Docs/ToDoV2.md` baru berisi rencana asset rank baru, tambahan
  quest, mini boss tiap jam 00:00 & 12:00, dan ability/stat per item.
  `Docs/ToDo.md` lama tidak diubah isinya, hanya diberi penunjuk ke v2.

## UI Shop Ringkas + /credit & /botinfo

- `/shop` dirampingkan: daftar item pindah dari field ke satu blok deskripsi,
  satu item = dua baris (nama + ID, lalu harga · rarity · efek). Lore/deskripsi
  item dihapus, emoji rarity dihapus (teks rarity tetap ada, juga di select
  menu filter), dan penanda `error` untuk item yang tak terbeli dihilangkan —
  hanya item yang mampu dibeli yang dapat centang.
- Command baru `/credit`: daftar kontributor beserta perannya (backend,
  frontend, dll). User ID diisi manual di array `CREDITS` pada file command.
- Command baru `/botinfo`: versi bot, Node.js, discord.js, SQLite3
  (better-sqlite3) + ukuran database, uptime, latency, memori, jumlah server,
  member, dan command.
- Emoji baru di registry: `backend`, `frontend`, `person`, `developer`,
  `nodejs`, `discordjs`, `database`.

## Ikon Item & Rombak UI Shop

- Tiap item shop punya emoji sendiri (`src/lib/itemEmojis.js`, ID dari
  `assets/items/emoji_itam.md`), dipakai di `/shop`, `/inventory`, `/buy`, dan
  `/use`. Nama tak dikenal jatuh ke `📦`, jadi item tambahan tidak bikin error.
- Rarity item bawaan sekarang mengikuti daftar resmi `assets/items/ListItem.md`
  lewat peta `ITEM_TIERS`, bukan ditebak dari rentang harga (harga tetap jadi
  fallback untuk item di luar katalog).
- `/shop`: header saldo, hitung mundur refresh dengan timestamp relatif,
  badge warna rarity + peluang drop, penanda mampu/tidak beli, deskripsi item,
  select menu filter tier di pesan, warna embed mengikuti tier yang difilter,
  dan urutan rarity tertinggi lebih dulu.
- `/inventory`: menampilkan ID item asli untuk `/use`, ikon, dan badge rarity.

## Test, Linter, dan Font Kartu Adaptif

- Logika murni dipisah ke `src/lib/leveling.js`, `src/lib/daily.js`, dan
  `src/lib/tiers.js`; `messageCreate`, `/daily`, dan rotasi shop tinggal
  memanggilnya. `src/database/shop.js` kini juga mengembalikan `price` dan `id`
  item inventori supaya UI bisa menghitung rarity.
- `npm test`: 25 test dengan runner bawaan Node (`node:test`), tanpa dependency
  tambahan.
- `npm run lint` / `npm run format`: ESLint 9 flat config + Prettier.
- `fitText()` di `src/cards/canvasKit.js` mengecilkan font bertahap untuk nama
  panjang sebelum memotong dengan elipsis — dipakai di kartu profile, rank, dan
  leaderboard.

## Sesi Voice Tahan Restart

Sesi voice yang sedang berjalan kini dicerminkan ke tabel `voice_sessions`
(write-through dari memori). Manfaatnya:

- Bot mati di tengah sesi tidak lagi menghanguskan waktu voice — saat boot,
  `restoreVoiceTracking()` melanjutkan sesi dengan `joinedAt` dan jam poin
  aslinya, jadi durasi dan sisa poin tetap dibayar.
- Kalau kelayakan berubah selama bot mati (teman keluar, pindah AFK), masa
  downtime tidak dibayar — jam poin dimajukan tanpa pembayaran hantu.
- Baris sesi untuk user yang sudah keluar voice selama bot mati dibuang
  otomatis saat restore.
- User yang keluar voice sebelum bot sempat restore tetap dibayar penuh:
  `endSession` jatuh ke baris tabel kalau sesinya tidak ada di memori.

## Leaderboard Mingguan

Subcommand baru `/leaderboard mingguan`: poin yang didapat user di pekan
berjalan, diurutkan dari terbesar.

- Snapshot per periode disimpan di tabel `weekly_points` dengan kunci pekan
  ISO yang sama dengan quest mingguan; ganti pekan = mulai dari nol tanpa
  pekerjaan reset berkala, dan baris lama tetap tersimpan sebagai riwayat.
- Pengisian terjadi otomatis di `addPoints()`, jadi semua sumber poin (chat,
  voice, exchange) terhitung tanpa hook tambahan.

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
