# ToDo

Daftar hal yang belum digarap, diurutkan dari yang paling terasa dampaknya.
Kalau mengerjakan salah satu, buka issue/PR dan centang di sini.

## Prioritas

- [x] **Item di inventori belum bisa dipakai.** Sudah ada `/use <id>` plus
  kolom `effect` di katalog (`src/database/shopCatalog.js`); item tanpa efek
  tetap jadi koleksi.
- [x] **Anti-spam poin chat.** Sudah ada cooldown 3 detik per user plus
  pengecekan isi duplikat persis (jendela 30 detik); logika di
  `src/lib/antispam.js`, angkanya di `CHAT.ANTISPAM_COOLDOWN_MS` /
  `CHAT.DUPLICATE_WINDOW_MS`.
- [x] **Poin voice untuk user yang sendirian atau AFK.** Sekarang butuh
  minimal `VOICE.MIN_LISTENERS` (2) manusia tidak deaf di channel dan bukan
  AFK channel; kelayakan dicek ulang tiap perubahan voice state.
- [x] **Backup database.** Ada `npm run backup` (`scripts/backup-db.js`) yang
  menyalin lewat `db.backup()` bawaan better-sqlite3 ke `data/backups/`,
  aman saat bot berjalan, retensi default 7 salinan (`BACKUP_KEEP`).

## Fitur

- [x] `/bank deposit` dan `/bank withdraw` — kolom di tabel ternyata bernama
  `bank` (bukan `bankBalance`); command baru `/bank` dengan dua subcommand.
- [x] Sistem quest harian/mingguan. `/quest` dengan 2 quest harian + 1
  mingguan yang diundi dari katalog `src/lib/quests.js`; progres otomatis
  dari chat, voice, daily, use, buy, dan give; klaim lewat tombol.
- [x] `/shop` dengan filter tier dan pencarian nama. Opsi `tier:` (pilihan
  Common–Mythic) dan `cari:` (substring nama); filter ikut tersimpan di
  customId supaya tombol halaman tetap jalan setelah bot restart.
- [x] Command admin: `/admin give-coin`, `/admin reset-user`, `/admin
  set-level`. Terkunci lewat `setDefaultMemberPermissions(Administrator)`;
  reset-user wajib `konfirmasi: true` dan menghapus baris di keempat tabel.
- [x] Leaderboard mingguan. `/leaderboard mingguan` membaca tabel snapshot
  `weekly_points` (kunci pekan ISO); terisi otomatis dari `addPoints()` jadi
  semua sumber poin terhitung.

## Teknis

- [x] **Voice tracking hilang saat restart.** Sesi berjalan kini dicerminkan
  ke tabel `voice_sessions` (write-through); saat boot sesi dilanjutkan dengan
  waktu aslinya, baris usang dibuang, dan `endSession` bisa jatuh ke tabel.
- [x] **Belum ada test sama sekali.** `npm test` (node:test bawaan Node, tanpa
  dependency runner) menguji `src/lib/leveling.js`, `src/lib/daily.js`,
  `src/lib/tiers.js`, dan peta emoji item — 25 test, semuanya fungsi murni.
- [x] **Belum ada linter.** ESLint 9 (flat config di `eslint.config.js`) +
  Prettier: `npm run lint`, `npm run lint:fix`, `npm run format`.
- [x] **Ganti `console.log` dengan logger yang punya level dan timestamp.**
  Ada `src/lib/logger.js`: empat level (debug/info/warn/error) dengan filter
  `LOG_LEVEL`, timestamp lokal di tiap baris, dan `scope()` pengganti awalan
  bracket manual (`[Admin]`, `[Shop]`, `[Voice]`). Semua `src/` dan
  `scripts/` sudah lewat logger; objek `Error` tetap tercetak dengan stack
  utuh. Dites di `test/logger.test.js`.
- [x] Ukuran font kartu sudah menyesuaikan nama panjang: helper `fitText()` di
  `src/cards/canvasKit.js` mengecilkan font bertahap sampai batas minimum, baru
  memotong dengan elipsis. Dipakai di kartu profile, rank, dan leaderboard.

## Lanjutan

Rencana gelombang berikutnya (asset rank baru, tambah quest, mini boss dua kali
sehari, ability/stat item) pindah ke [ToDoV2.md](ToDoV2.md). Isi halaman ini
dibiarkan apa adanya sebagai riwayat.
