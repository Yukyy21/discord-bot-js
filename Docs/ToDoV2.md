# ToDo v2

Gelombang kedua. Isi [ToDo.md](ToDo.md) yang lama sengaja dibiarkan sebagai
riwayat — yang di bawah ini yang belum digarap sama sekali. (asset rank akan digarap oleh @ferr, Minibos, asset rank, ability,akan digarap oleh @Nekoomaruu)

## Prioritas

- [x] **Ganti asset rank di kartu.** Logo tier di `assets/ranks/*.png`
  (dipakai `src/cards/rankCard.js` lewat field `rankLogo` dari
  `src/lib/ranks.js`) diganti dengan set gambar baru. Perlu dicek juga:
  ukuran/posisi gambar di kartu `rank` dan `profile`, background
  `assets/rank/Rank.jpeg`, serta emoji tier `tier_*` di `src/lib/emojis.js`
  supaya gaya visualnya tetap satu keluarga.
  Selesai: set baru kotak dari `assets/emoji/` (Novice–Demigod), ukuran/posisi
  lewat helper `drawRankLogo()` di `src/cards/canvasKit.js`; background dan
  emoji tier tidak berubah karena set barunya memang satu keluarga dengan
  emoji `tier_*`.

- [x] **Tambah quest.** Katalog `QUEST_CATALOG` di `src/lib/quests.js` baru
  berisi 5 quest harian dan 3 mingguan, jadi undian sering mengulang misi yang
  sama. Rencana: tambah tipe quest baru (naik level, belanja sampai nominal
  tertentu, menang/ikut event, klaim streak beruntun, pakai item rarity
  tertentu), plus pertimbangkan quest bulanan dan tingkat kesulitan yang
  hadiahnya menyesuaikan. Tipe baru butuh pemanggil `addQuestProgress()` di
  tempat kejadiannya.
  Selesai: tipe `spend`, `level_up`, `daily_streak` (mode max), `use_tier`
  (meta rarity) + scope bulanan; pool jadi 7/7/5 dengan hadiah sesuai
  kesulitan. Varian "menang/ikut event" menunggu sistem boss/event
  (@Nekoomaruu).

- [x] **Mini boss spawn jam 00:00 dan 12:00.** Boss muncul otomatis dua kali
  sehari di channel `BOSS_CHANNEL_ID`, member menyerang lewat tombol, hadiah
  dibagi ke top 3 damager + last hit.
  Selesai: penjadwal tahan restart (`dueSpawnSlot()` + `slotUsed()` di
  `src/lib/boss.js` / `src/database/boss.js`), tabel `boss_spawns` dan
  `boss_damage`, katalog di `src/lib/bossCatalog.js`, angka di `BOSS`
  (`src/config/constants.js`), dan buff ability boss sudah terbaca. Sisa
  catatan balancing-nya pindah ke gelombang tiga di bawah.

- [x] **Ability/stat per item.** Setiap item punya stat (ATK, DEF, HP, LUCK)
  dan/atau ability yang berlaku saat dipakai atau saat ikut event boss.
  Sekarang kolom `effect` hanya mengenal `xp` dan `points`
  (`src/database/shopCatalog.js`), jadi butuh perluasan format efek, migrasi
  kolom baru, tampilan stat di `/shop`, `/inventory`, dan `/use`, plus
  keputusan apakah item bisa "dipasang" (equip) atau habis sekali pakai.

## Gelombang Tiga — Balancing Coin, XP & Poin

Semua fitur besar sudah jalan; yang belum pernah disetel adalah **angkanya**.
Hitungan lengkap, tabel pemasukan harian, dan usulan angka ada di
[Balancing.md](Balancing.md). Urutan di bawah dari yang dampaknya paling
terasa.

- [ ] **Rombak hadiah boss.** Sekarang 80–90% coin yang masuk ke server datang
  dari boss dan hanya ke maksimal 4 orang; peserta lain dapat nol. Rencana:
  bagi sebagian pool (mis. 60%) proporsional ke damage semua peserta, sisanya
  bonus top 3 + last hit; turunkan `reward.coin` di
  `src/lib/bossCatalog.js`; tambah `MIN_PARTICIPANTS` supaya satu orang tidak
  bisa solo-farm selama 6 jam despawn; pertimbangkan geser slot 00:00 ke jam
  yang servernya hidup.

- [ ] **Timbang item acak saat level up.** `src/events/messageCreate.js` masih
  mengundi uniform dari seluruh katalog, jadi Mythic bisa jatuh gratis dengan
  peluang sampai 50% per level. Pakai `weightedRandom()` yang sudah ada di
  `src/lib/tiers.js`, dan beri plafon pada `level × 50` coin di
  `src/lib/ranks.js`.

- [ ] **Batasi streak `/daily`.** Bonus +100/hari tanpa batas: hari ke-100 =
  10.400 coin sehari. Tambah `DAILY.STREAK_MAX_BONUS` di
  `src/config/constants.js`.

- [ ] **Naikkan nilai voice + XP dari voice.** 1 jam voice = 20 poin (±70 kata
  chat) dan voice tidak memberi XP sama sekali, jadi member voice-only tidak
  pernah naik level. Usulan: `VOICE.POINTS_PER_INTERVAL` 5 → 8 dan
  `VOICE.XP_PER_INTERVAL` baru, dipakai di `src/events/voiceStateUpdate.js`.

- [ ] **Tutup jalur beli-leaderboard.** `/give` tanpa pajak/limit +
  `/exchange` 500:1 tanpa batas = poin bisa disuplai akun kedua. Rencana: pajak
  transfer, limit harian `/exchange`, atau kurs yang naik seiring jumlah poin
  yang sudah ditukar.

- [ ] **Sink coin permanen.** Sekarang coin cuma keluar lewat `/shop` dan
  `/exchange`; `/bank` netral. Ide: biaya tarik bank, ongkos `/give`, harga
  shop dinamis, atau item konsumtif yang wajib untuk boss.

- [ ] **Harga item vs manfaatnya.** Multiplier coin praktis hanya berguna
  sebagai alat timing (coin tidak pernah masuk dari chat/voice), dan buff XP
  kena plafon 20 XP/pesan sehingga Plasma Blaster 18.000 tidak sepadan. Perlu
  penyetelan ulang harga/nilai di `src/database/shopCatalog.js`, plus kunci
  multiplier saat quest **selesai** (bukan saat diklaim) di
  `src/database/quests.js`.

- [ ] **Samakan zona waktu periode.** `/daily`, quest harian & bulanan memakai
  tanggal UTC (hari baru jam 07:00 WIB), sementara boss sudah pakai
  `BOSS.UTC_OFFSET`. Satukan ke satu helper offset.

## Catatan Urutan

Balancing boss dikerjakan duluan karena dia sumber coin terbesar — mengubah
yang lain sebelum boss disetel hasilnya akan berubah lagi. Item acak level-up
dan cap streak daily berdiri sendiri, aman dikerjakan kapan saja. Sink coin
baru dilakukan terakhir, setelah kelihatan berapa coin yang benar-benar
beredar.

Sebelum menggarap ini, baca juga [Bugs.md](Bugs.md) — beberapa temuan di sana
(item acak level-up, `daily_reset` yang menghapus streak) adalah bug sekaligus
isu balancing.
