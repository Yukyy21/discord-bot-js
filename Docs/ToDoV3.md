# ToDo v3

Gelombang ketiga. [ToDo.md](ToDo.md) dan [ToDoV2.md](ToDoV2.md) dibiarkan
sebagai riwayat — semua isinya sudah selesai. Di bawah ini sisa pekerjaan
yang benar-benar belum digarap, diambil dari [Bugs.md](Bugs.md) dan
[Balancing.md](Balancing.md).

## Bug

- [x] **Stok shop global untuk semua guild.** (Bugs.md #5) Stok item di
  `/shop` dipakai bersama lintas server — server rame bisa menghabiskan stok
  server lain. Pisahkan stok per guild atau jadikan stok tidak terbatas.

- [x] **Mini boss hanya bisa satu guild.** (Bugs.md #6) `BOSS_CHANNEL_ID`
  tunggal berarti hanya satu server yang bisa spawn boss. Perlu tabel
  konfigurasi per guild (channel boss per server) dan penjadwal yang
  mengiterasi semuanya.

- [x] **Balapan update embed boss.** (Bugs.md #7) Dua penyerang bersamaan
  bisa menimpa update embed satu sama lain. Antrekan update embed boss
  (mutex per spawn) atau debounce dengan edit terjadwal.

- [x] **`xp_fill` menggantung kalau `POINT_CHANNEL_ID` diisi.** (Bugs.md #8)
  Embed progres XP tidak pernah terkirim ketika channel poin di-set.
  Perbaiki jalur pengiriman notifikasi level-up.

- [ ] **`voiceMinutes` staff cuma tercatat saat keluar voice.** Beda dari
  `voice_seconds` biasa yang diperbarui tiap interval periodik
  (`setInterval` di `voiceStateUpdate.js`), akumulasi `voiceMinutes` untuk
  leaderboard staff (`addVoiceMinutes` di `src/database/staff.js`) cuma
  jalan di `endSession()` — dipanggil saat user keluar voice channel. Staff
  yang duduk berjam-jam tanpa pernah leave (pindah channel tidak masalah,
  cuma leave beneran) tidak dapat kredit `voiceMinutes` sampai dia keluar,
  jadi `/best-staff-of-the-month` bisa terlihat nol padahal staff itu aktif
  di voice sepanjang bulan. Perlu diputuskan: apakah ini disengaja (staff
  harus "menyelesaikan" sesi biar terhitung), atau perlu disamakan dengan
  `voice_seconds`/Poruv yang membayar tiap `VOICE.INTERVAL_MS` supaya staff
  yang sesi panjangnya belum berakhir tetap kelihatan progresnya di
  leaderboard bulan berjalan.

## Balancing

- [x] **Batasi XP chat per menit.** Spam chat bisa memompa puluhan ribu
  XP/jam sementara member normal hanya ratusan. Tambah plafon XP per menit
  per user di `src/events/messageCreate.js` (atau kurangi XP setelah N pesan
  per menit) supaya chat aktif tetap dihargai tanpa membuka jalan spam.

- [x] **Coin sink tambahan.** Sink permanen baru satu: biaya `/give` 5%.
  Kandidat berikutnya dari [Balancing.md](Balancing.md): biaya tarik
  `/bank withdraw` (mis. 1–2%), item konsumtif wajib untuk boss (elixir),
  atau harga shop yang naik mengikuti jumlah coin beredar.

- [x] **Harga item vs manfaatnya.** Crystal Dagger dan Plasma Blaster
  (18.000 coin) tidak sepadan dengan buff-nya — buff XP kena plafon
  20 XP/pesan. Setel ulang harga/efek di `src/database/shopCatalog.js`
  setelah ada angka peredaran coin yang lebih baru.

## Fitur

- [x] **Quest "menang/ikut event".** Sisa dari ToDoV2: tipe quest yang
  menghitung partisipasi dan kemenangan boss/event. Sistem boss sudah jalan,
  jadi tinggal panggil `addQuestProgress()` dari `src/lib/bossManager.js`
  saat spawn selesai (partisipasi) dan saat hadiah dibagikan (kemenangan),
  lalu tambah entri `boss_kill`/`boss_join` ke `QUEST_CATALOG`.

- [x] **Equip item.** Sekarang ability/stat item berlaku pasif begitu
  dibeli. Pertimbangkan sistem pasang/lepas (slot equip terbatas) supaya
  pilihan build terasa — butuh kolom equipped per user dan tampilan di
  `/inventory`.

## Fitur: Sistem Staff (SELESAI — diimplementasikan di branch ferr-path2)

Tiga command baru: `/staff`, `/staff-rating`, `/best-staff-of-the-month`.
Staff ditentukan **manual** lewat command admin, bukan berdasar role Discord.

### `/staff-set` (admin) — kelola daftar staff (SELESAI)
- Parameter: `type:(add/remove)`, `user`, `divisi` (wajib saat add),
  `deskripsi` (opsional).
- Tabel baru `staff`: `userId, guildId, divisi, deskripsi, addedAt, addedBy`.

### `/staff` — daftar staff aktif (SELESAI)
- Mirip `/credit`: embed dikelompokkan per divisi, pagination kalau lebih
  dari satu halaman (pola `pagerRow` yang sudah ada di `src/ui/pager.js`).
- Tiap entri nampilin nama, divisi, deskripsi, dan rata-rata bintang rating
  (kalau staff itu punya rating).

### `/staff-rating` — rating dari user ke staff (SELESAI)
- Parameter: `user`, `stars:(1-5)`, `comment` (opsional).
- Tabel baru `staff_ratings`: `staffUserId, raterUserId, guildId, stars,
  comment, createdAt, updatedAt`.
- Unique constraint `(staffUserId, raterUserId, guildId)` — 1 user cuma bisa
  kasih 1 rating per staff. Rating ulang dari user yang sama = update
  (`INSERT OR REPLACE`), bukan nambah baris baru.
- Rating **tidak** ikut jadi metrik skor `/best-staff-of-the-month` — cuma
  ditampilkan di `/staff` sebagai info tambahan.

### `/best-staff-of-the-month` — leaderboard bulanan (SELESAI)
- Tabel baru `staff_activity`: `userId, guildId, yearMonth, messageCount,
  voiceMinutes, tagCount, announcementCount`. Baris baru otomatis per
  `yearMonth` → reset alami tiap bulan, histori bulan lalu tetap tersimpan
  buat dilihat lewat parameter `bulan` opsional (default bulan berjalan).
- **4 metrik, bobot sama rata (25% masing-masing)**:
  1. Jumlah pesan (semua channel) — staff aja.
  2. Voice minutes — pakai syarat sama seperti sistem Poruv (minimal 2 orang
     tidak deaf di channel), bukan syarat baru.
  3. Jumlah tag `@everyone` atau role — deteksi `message.mentions.everyone`
     dan `message.mentions.roles.size > 0`.
  4. Jumlah pesan di channel announcement — cek `message.channelId` masuk
     `ANNOUNCEMENT_CHANNEL_IDS` (env baru, comma-separated, mirip pola
     `ADMIN_ROLE_IDS`).
- **Cara gabung skor**: tiap metrik dinormalisasi dulu (nilai staff dibagi
  nilai staff tertinggi di metrik itu bulan ini → jadi rentang 0-1), baru
  dirata-rata ke-4 metrik. Jangan jumlah mentah langsung dijumlah, karena
  satuannya beda (pesan vs menit vs jumlah tag) — staff dengan pesan banyak
  tapi voice nol tidak boleh otomatis kalah dari staff campuran kalau
  proporsinya sepadan.
- 1 leaderboard gabungan buat semua staff, **tidak** dipisah per divisi.

### Yang perlu disentuh buat tracking (SELESAI)
- `src/events/messageCreate.js` — tambah cabang: kalau pengirim ada di
  tabel `staff` untuk guild ini, increment `messageCount`; kalau
  `message.mentions.everyone` atau `message.mentions.roles.size > 0`,
  increment `tagCount`; kalau `channelId` ada di `ANNOUNCEMENT_CHANNEL_IDS`,
  increment `announcementCount`. Semua nulis ke baris `staff_activity`
  bulan berjalan (`yearMonth` dari tanggal sekarang).
- `src/events/voiceStateUpdate.js` — tambah cabang serupa punya Poruv:
  kalau user staff dan syarat "minimal 2 orang tidak deaf" terpenuhi,
  akumulasi `voiceMinutes` ke baris `staff_activity` bulan berjalan.

### File baru yang diperkirakan (SELESAI)
- `src/database/staff.js` — CRUD staff, rating, activity, hitung skor.
- `src/commands/staff/staffSet.js`, `staff.js`, `staffRating.js`,
  `bestStaffOfTheMonth.js`.

### Env baru (SELESAI)
- `ANNOUNCEMENT_CHANNEL_IDS` — comma-separated channel ID, ditambah ke
  `.env.example` dan tabel env di `README.md`.

## Catatan Urutan

Empat bug di atas berdiri sendiri dan aman dikerjakan kapan saja. Plafon XP
chat dikerjakan sebelum menambah coin sink baru — keduanya mengubah jumlah
mata uang yang beredar, jadi jangan disetel bersamaan supaya efeknya bisa
diukur terpisah.
