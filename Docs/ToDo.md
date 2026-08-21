# ToDo

Daftar hal yang belum digarap, diurutkan dari yang paling terasa dampaknya.
Kalau mengerjakan salah satu, buka issue/PR dan centang di sini.

## Prioritas

- [x] **Item di inventori belum bisa dipakai.** Sudah ada `/use <id>` plus
  kolom `effect` di katalog (`src/database/shopCatalog.js`); item tanpa efek
  tetap jadi koleksi.
- [ ] **Anti-spam poin chat.** Kata dihitung apa adanya, jadi mengirim satu kata
  berulang kali tetap menghasilkan poin. Perlu cooldown per user atau
  pengecekan pesan duplikat di `src/events/messageCreate.js`.
- [ ] **Poin voice untuk user yang sendirian atau AFK.** Duduk sendirian di
  channel atau di AFK channel tetap dihitung. Perlu syarat minimal dua orang
  yang tidak deaf.
- [ ] **Backup database.** `data/economy.db` tidak pernah di-backup. Tambahkan
  skrip yang menyalin file pakai `db.backup()` bawaan better-sqlite3.

## Fitur

- [ ] `/bank deposit` dan `/bank withdraw` — kolom `bankBalance` sudah ada di
  tabel, tapi belum ada command yang mengisinya.
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
