# Bug & Temuan

Hasil pembacaan kode + menjalankan `npm test`. Diurutkan dari yang paling
mengganggu. Status: **#1, #2, #3, #4, #5, #6, #7, #8, #9, dan #10 sudah
diperbaiki** — semuanya tutup. #3 & #4 sudah fix sejak lama tapi dokumen ini
terlambat ditandai; perilakunya kini juga dikunci tes di Gelombang Tiga Belas.

## 1. (fixed)`npm test` merah (1 dari 66 test gagal) — SUDAH DIPERBAIKI

`test/quests.test.js` masih memakai daftar `TYPES` lama, belum memuat tipe
quest boss:

```
not ok 53 - semua quest katalog valid
    error: 'boss_join_1: tipe tidak dikenal'
```

Perbaikan (selesai): `'boss_join'` dan `'boss_kill'` ditambahkan ke konstanta
`TYPES` di `test/quests.test.js`. Sekarang `npm test` hijau (66/66).

## 2. (Fixed) item `daily_reset` justru menghancurkan streak — SUDAH DIPERBAIKI

`src/database/abilities.js` mengeset `lastDaily = NULL` untuk `daily_reset`
(Tears of the Fallen, Epic 22.000) dan `cooldown_reset`. Tapi
`computeDailyClaim()` menentukan streak dari perbandingan `lastDaily` dengan
tanggal kemarin — kalau `NULL`, klaim berikutnya dihitung **streak 1**.
Jadi item yang harusnya menguntungkan malah membuang seluruh streak user.

Perbaikan (selesai): `src/database/abilities.js` kini punya helper
`rewindDaily()` yang mengisi `lastDaily` dengan tanggal **kemarin**
(`dateKey(Date.now() - DAILY.DAY_MS)`) untuk `daily_reset` maupun
`cooldown_reset`. User bisa klaim lagi sekarang dan streak-nya tetap lanjut.

## 3. (fixed) Item acak level-up tidak ditimbang rarity — SUDAH DIPERBAIKI

`src/events/messageCreate.js` memilih hadiah item dengan
`items[Math.floor(Math.random() * items.length)]` — uniform atas seluruh
katalog, jadi Mythic sama gampangnya dengan Common, dengan peluang sampai 50%
per level. `weightedRandom()` di `src/lib/tiers.js` sudah ada tapi tidak
dipakai di jalur ini. Dampaknya ke ekonomi besar (lihat [Balancing.md](Balancing.md)).

Perbaikan (selesai, sejak refactor Bug #8): level-up dipindah ke satu jalur
bersama `reconcileLevels()` di `src/lib/levelingManager.js`, yang memilih item
grant lewat `weightedRandom(items, 1)` — peluang mengikuti bobot tier (Common
30, Mythic 5). `reconcileLevels` juga kini menerima `rng` opsional (default
`Math.random`) untuk tes deterministik. Dikunci oleh `test/levelUpWeighted.test.js`.

## 4. (fixed) Hari `/daily` memakai tanggal UTC — SUDAH DIPERBAIKI

`src/lib/daily.js` memotong ISO string UTC, jadi bagi pemain WIB "hari baru"
mulai pukul **07:00 pagi**, bukan tengah malam. Sistem boss sudah punya
`BOSS.UTC_OFFSET`; daily, quest harian, dan bulanan belum ikut offset yang sama.

Perbaikan (selesai, sudah lama): `daily.js` dan ketiga kunci periode quest
(`dailyKey`/`weeklyKey`/`monthlyKey` di `src/lib/quests.js`) semuanya melewati
`localDateKey(new Date())` yang menambah `BOSS.UTC_OFFSET` (default +7 WIB),
jadi "ganti hari" mengikuti waktu lokal server, bukan UTC. Dokumen ini
terlambat ditandai. Dikunci oleh tes timezone di `test/daily.test.js` dan
`test/quest.test.js` (Gelombang Tiga Belas).

## 5. (fixed) Stok shop global untuk semua guild â€" SUDAH DIPERBAIKI

`src/lib/shopRotation.js` menyimpan `currentStock` di satu variabel modul dan
menjalankan `setInterval` saat file di-`require`. Konsekuensinya: semua guild
melihat stok yang sama, dan `/buy` bisa gagal ("item tidak ada di shop") kalau
rotasi 10 menit kebetulan lewat antara user membuka `/shop` dan menekan
`/buy`.

Perbaikan (selesai): stok sekarang disimpan per-guild di `Map<guildId, ...>`.
`getShopStock(guildId)`, `getShopItemById(guildId, id)`, `getShopRefreshAt(guildId)`,
dan `getShopTimers(guildId)` menerima `guildId`, sehingga `/shop` dan `/buy`
memakai etalase server-nya masing-masing. Setiap guild punya undian acak dan
jam rotasi 10 menit sendiri; interval global tetap mengundi ulang semua guild
yang pernah membuka shop.

## 6. (fixed) Mini boss hanya bisa satu guild â€" SUDAH DIPERBAIKI

`BOSS_CHANNEL_ID` dibaca sekali dari `.env`, jadi penjadwal hanya pernah spawn
di satu channel/guild. Bot di lebih dari satu server tidak akan punya boss di
server lainnya. Kalau memang multi-guild, channel boss perlu disimpan per guild
di database.

Perbaikan (selesai): channel boss kini dikonfigurasi per-guild lewat command
admin baru `/boss-channel` (`set` / `show` / `clear`), disimpan di tabel
`guild_config` (`src/database/guildConfig.js`). Penjadwal (`startBossScheduler`
di `src/lib/bossManager.js`) mengiterasi semua guild yang punya konfigurasi
lewat `listBossTargets()` dan spawn di tiap channel yang jadwal slot-nya belum
dipakai. `spawnBoss()` memakai prioritas channel: eksplisit → konfigurasi
per-guild → fallback `BOSS_CHANNEL_ID` (dari `.env`, tetap dilayani untuk
guild yang belum di-set). `/admin-spawn-boss` sekarang spawn di guild tempat
command dijalankan. Boss di tiap guild tetap satu-satu (`getActiveBoss(guildId)`
dan `slotUsed(guildId, slot)` sudah per-guild).

## 7. (fixed) Balapan update embed boss â€" SUDAH DIPERBAIKI

`handleBossAttack()` memakai `interaction.update()` pada pesan boss. Dua
serangan yang datang hampir bersamaan bisa membuat embed menampilkan HP yang
lebih tua (bukan salah data — data di SQLite tetap benar, hanya tampilannya
yang bisa mundur sesaat).

Perbaikan (selesai): update embed boss diantre per-spawn
(`queueMessageEdit(bossId, task)` di `src/lib/bossManager.js`). Semua edit
pesan boss — embed HP saat serangan, disable tombol saat despawn
(`escapeBoss`), dan pemulihan saat restart (`restoreBosses`) — berjalan serial
per `bossId`. Setiap task membaca ulang state terbaru dari database tepat
sebelum menulis, jadi embed yang tampil selalu mengikuti kondisi terkini.
`handleBossAttack()` kini `deferUpdate()` (biar tidak timeout) lalu edit
diantre, jadi dua penyerang nyaris bersamaan tidak saling menimpa lagi.

## 8. (fixed) `xp_fill` menggantung kalau `POINT_CHANNEL_ID` diisi — SUDAH DIPERBAIKI

Rekonsiliasi level dipindah dari `messageCreate` ke satu jalur bersama di
`src/lib/levelingManager.js` (`reconcileLevels()`). Semua sumber XP — chat,
`/use` item (termasuk `xp_fill`), voice, dan hadiah boss — kini langsung
mereka level begitu XP melewati batas, tanpa menunggu chat di channel poin.
Level-up diumumkan ke `POINT_CHANNEL_ID` bila terisi, kalau tidak ke channel
konteks event atau channel teks pertama guild. Pesan `xp_fill` juga tidak lagi
menjanjikan "chat sekali" karena naik level sudah terjadi seketika di `/use`.

## 9. (fixed) `/give` dan `/exchange` tanpa batas — SUDAH DIPERBAIKI

Tidak ada limit harian, tidak ada minimum umur akun (pajak `/give` 5% sudah
aktif dan benar-benar dipotong—lihat catatan sink coin). Coin dari akun lain
bisa langsung jadi poin leaderboard. Detail dan usulan angkanya ada di
[Balancing.md](Balancing.md).

Perbaikan (selesai): limit harian dipasang, dua-duanya (`GIVE` di
`src/config/constants.js`): `DAILY_LIMIT_COUNT = 5` (jumlah transfer/hari) dan
`DAILY_LIMIT_COIN = 50000` (nominal keluar/hari). Dipantau lewat tabel
`give_daily` (`src/database/giveDaily.js`, reset alami tiap ganti hari waktu
lokal event) dan dicek di `/give` sebelum transfer. Keputusan owner: pasang
limit harian saja, tidak melibatkan minimum umur akun.

## 10. Dokumentasi tertinggal — SUDAH DIPERBAIKI

`Docs/Bot.md` bagian "Aturan Angka" belum punya bagian mini boss, dan
`Docs/ToDoV2.md` masih menandai mini boss sebagai belum digarap padahal sudah
jalan. Update ini juga menutup label status #3 dan #4 yang sudah lama fixed
tapi belum didokumentasikan (Gelombang Tiga Belas).
