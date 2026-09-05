# ToDo v3

Gelombang ketiga. [ToDo.md](ToDo.md) dan [ToDoV2.md](ToDoV2.md) dibiarkan
sebagai riwayat — semua isinya sudah selesai. Di bawah ini sisa pekerjaan
yang benar-benar belum digarap, diambil dari [Bugs.md](Bugs.md) dan
[Balancing.md](Balancing.md).

## Bug

- [x] **`finishBoss` tidak idempoten.** (bug2.md #3) Tidak ada guard status
  sebelum `distributeRewards` di `src/lib/bossManager.js`. Fix: guard
  `if (getBossById(row.id)?.status !== 'defeated') return [];` di awal
  `finishBoss`.

- [x] **`/use` null-deref kalau `describeEffect` return null.** (bug2.md #5)
  `src/commands/economy/use.js` kini cek `if (!info) return error reply;`
  sebelum akses `info.emoji`.

- [x] **Voice chunks tak dibatasi setelah downtime lama.** (bug2.md #6)
  `src/events/voiceStateUpdate.js` kini men-cap `chunks` ke
  `VOICE.MAX_CHUNKS_PER_GRANT` (4 = 1 jam) di `syncEligibility` dan interval
  berkala, di `src/config/constants.js`. Sisa chunk di atas cap tetap
  tertelusuri lewat `lastGrant`, dibayar bertahap di tick berikutnya.

- [ ] **Progress bar XP NaN di level 0.** (bug2.md #7) `xpForLevel(0) = 0`
  bikin `xp / xpNeeded` jadi `0/0 = NaN` di `profileCard.js` dan
  `rankCard.js`. Ada guard `pct > 0` jadi tidak crash, cuma tampil kosong.
  Cuma bisa dipicu lewat `/admin set-level 0`. Fix: guard `xpNeeded <= 0`
  di kedua card. (fix nanti(

- [ ] **`undefined` sebagai parameter SQL di `quests.js`.** (bug2.md #8)
  `src/database/quests.js` mengoper `undefined` ke `update.run()`.
  better-sqlite3 mengoersi ke `null` sekarang, tapi bukan tipe parameter
  yang terdokumentasi resmi — bisa error kalau library di-upgrade. Fix:
  pakai `null` sebagai ganti `undefined`. (fix nanti)

- [ ] **Tombol serang stale saat boss kabur.** (bug2.md #9) Di
  `escapeBoss()` (`src/lib/bossManager.js`), kalau `resolveBossChannel`
  return null, fungsi return lebih awal sebelum sempat menonaktifkan tombol
  di pesan lama. Boss sudah `escaped` tapi tombolnya kelihatan masih aktif.
  Kosmetik saja (klik tombol itu cuma dapat "boss sudah selesai"), tidak
  merusak data.(fix nanti)

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

- [x] **`voiceMinutes` staff cuma tercatat saat keluar voice.** Diselesaikan
  dengan memutuskan untuk menyamakan dengan `voice_seconds`/Poruv yang
  membayar tiap `VOICE.INTERVAL_MS`. `voiceStateUpdate.js` kini punya helper
  `grantStaffVoiceMinutes(session, chunks)` yang mengakumulasi `voiceMinutes`
  staff pada setiap satuan interval **layak** yang dibayar — dipanggil dari
  tiga jalur pembayaran poin (interval berkala, `syncEligibility` saat
  kehilangan kelayakan, dan `endSession` untuk sisa interval terakhir).
  Staff yang masih betah di voice mendapat kredit tiap 15 menit tanpa harus
  leave, dan hanya waktu layak (bukan sendirian/deaf/AFK) yang dihitung,
  konsisten dengan pembayaran Poruv/XP.

- [x] **`/admin reset-user` tidak membersihkan semua jejak user, dan
  `bumpActivity` merangkai nama kolom ke SQL tanpa saringan.** (Audit Gelombang
  Dua Belas) `resetUser` (`src/database/admin.js`) hanya menghapus 4 tabel, jadi
  buff aktif/limit `/give`/sesi voice/snapshot pekan/klaim Poruv/kontribusi
  boss masih bertahan — "reset" tidak benar-benar bersih. Kini ditambah 6 tabel
  (`give_daily`, `user_buffs`, `voice_sessions`, `weekly_points`, `boss_damage`,
  `poruv_redemptions`) di dalam satu transaksi; buff guild-wide (`userId='*'`)
  dipertahankan, dan data `staff`/`staff_ratings`/`staff_activity` sengaja tidak
  dihapus (data keanggotaan, bukan data member). `boss_damage` tidak ber-guild,
  jadi dihapus cukup per `userId`. Sementara itu `bumpActivity`
  (`src/database/staff.js`) kini memfilter `field` terhadap daftar emas
  `ACTIVITY_FIELDS` sebelum merangkai SQL menutup jalur injeksi. Embed
  `/admin reset-user` menampilkan semua baris terhapus. Tes
  `test/adminReset.test.js` (5 kasus) + 113/113 hijau.

- [x] **Item level-up dan hari `/daily`-quest ternyata sudah fix tapi tak
  ber-tes, dan dokumen masih menandainya terbuka.** (Gelombang Tiga Belas) Bug
  #3 (item level-up uniform, tak ditimbang rarity — Bugs.md) sudah terganti
  sejak refactor Bug #8: `reconcileLevels` (`src/lib/levelingManager.js`) memilih
  item pakai `weightedRandom`. Bug #4 (daily/quest pakai tanggal UTC — Bugs.md)
  sudah lewat `localDateKey` yang menambah `BOSS.UTC_OFFSET`. Keduanya baru
  sekarang dikunci: `reconcileLevels` menerima `rng` opsional untuk tes
  deterministik + `test/levelUpWeighted.test.js` membuktikan item digrant sesuai
  `weightedRandom`; `test/daily.test.js` & `test/quest.test.js` menambah kasus
  di batas divergensi UTC↔WIB (mis. `22:00Z` sudah hari/bulan berikutnya di WIB).
  Dokumen Bugs #3/#4/#10 ditandai fixed. `npm test` **116/116** hijau.

- [x] **Temuan audit lanjutan (Gelombang Empat Belas).** Lihat Bugs.md #11 dan
  `Docs/What I do.md` → Gelombang Empat Belas. Meliputi: (a) Sturdy tidak lagi
  melindungi ability instan (`daily_reset`/`cooldown_reset`/`xp_fill`/`extend_buffs`)
  — sebelumnya satu item bisa dipakai terus selama jatah Sturdy ada; (b)
  `computeLevelUp` (`src/lib/leveling.js`) menghitung lompatan level bertahap,
  tidak lagi membagi XP dengan biaya level awal (yang over-level); (c) interval
  voice (`src/events/voiceStateUpdate.js`) membayar semua chunk terakumulasi,
  konsisten dengan `endSession`/`syncEligibility`; (d) `spawnBoss` menggulung
  baris boss yang gagal terkirim (`deleteBoss` baru di `src/database/boss.js`);
  (e) tombol `poruv_resolve` wajib Administrator; (f) member yang belum
  ke-cache tidak dihitung sebagai manusia di ambang `MIN_LISTENERS`; (g)
  `finishBoss` memakai `bossDefeatedEmbed` saat kurang peserta (bukan
  "kabur"); (h) `editChains` dibersihkan di titik terminal; (i) Poruv Mythic
  tidak terpotong kalau katalog kosong. Tes: `test/sturdyAbility.test.js` (4),
  `test/poruvResolve.test.js` (+1), `test/leveling.test.js` diperbarui.
  `npm test` **122/122** hijau.

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
