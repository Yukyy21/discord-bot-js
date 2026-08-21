# ToDo

Daftar hal yang belum digarap, diurutkan dari yang paling terasa dampaknya.
Kalau mengerjakan salah satu, buka issue/PR dan centang di sini.

## Prioritas

- [x] **Item di inventori belum bisa dipakai.** Sudah ada `/use <id>` plus
  kolom `effect` di katalog (`src/database/shopCatalog.js`); item tanpa efek
  tetap jadi koleksi.
- [x] **Anti-spam poin chat.** Sudah ada cooldown 3 detik per user plus
  pengecekan isi duplikat (jendela 5 menit) di `src/events/messageCreate.js`;
  angkanya di `CHAT.COOLDOWN_MS` / `CHAT.DUPLICATE_WINDOW_MS`.
- [x] **Poin voice untuk user yang sendirian atau AFK.** Sekarang butuh
  minimal `VOICE.MIN_LISTENERS` (2) manusia tidak deaf di channel dan bukan
  AFK channel; kelayakan dicek ulang tiap perubahan voice state.
- [x] **Backup database.** Ada `npm run backup` (`scripts/backup-db.js`) yang
  menyalin lewat `db.backup()` bawaan better-sqlite3 ke `data/backups/`,
  aman saat bot berjalan, retensi default 7 salinan (`BACKUP_KEEP`).

## Fitur

- [x] `/bank deposit` dan `/bank withdraw` — kolom di tabel ternyata bernama
  `bank` (bukan `bankBalance`); command baru `/bank` dengan dua subcommand.
- [ ] Sistem quest harian/mingguan.
- [ ] `/shop` dengan filter tier dan pencarian nama.
- [ ] Command admin: `/admin give-coin`, `/admin reset-user`, `/admin set-level`.
- [ ] Leaderboard mingguan (butuh tabel snapshot per periode).

## Teknis

- [ ] **Voice tracking hilang saat restart.** Sesi berjalan disimpan di memori;
  kalau bot mati di tengah sesi, waktunya hangus. Simpan waktu mulai ke tabel
  supaya bisa dilanjutkan.
- [ ] **Belum ada test sama sekali.** Yang paling layak diuji lebih dulu:
  perhitungan level, streak daily, dan bobot undian shop — semuanya fungsi
  murni.
- [ ] **Belum ada linter.** ESLint + Prettier supaya gaya kode konsisten.
- [ ] Ganti `console.log` dengan logger yang punya level dan timestamp.
- [ ] Ukuran font kartu belum menyesuaikan nama panjang; nama sangat panjang
  masih terpotong.
