# Bug & Temuan

Hasil pembacaan kode + menjalankan `npm test`. Diurutkan dari yang paling
mengganggu. Status: **#1 dan #2 sudah diperbaiki**, sisanya masih terbuka.

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

## 3. Item acak level-up tidak ditimbang rarity

`src/events/messageCreate.js` memilih hadiah item dengan
`items[Math.floor(Math.random() * items.length)]` — uniform atas seluruh
katalog, jadi Mythic sama gampangnya dengan Common, dengan peluang sampai 50%
per level. `weightedRandom()` di `src/lib/tiers.js` sudah ada tapi tidak
dipakai di jalur ini. Dampaknya ke ekonomi besar (lihat [Balancing.md](Balancing.md)).

## 4. Hari `/daily` memakai tanggal UTC

`src/lib/daily.js` memotong ISO string UTC, jadi bagi pemain WIB "hari baru"
mulai pukul **07:00 pagi**, bukan tengah malam. Sistem boss sudah punya
`BOSS.UTC_OFFSET`; daily, quest harian, dan bulanan belum ikut offset yang sama.

## 5. Stok shop global untuk semua guild

`src/lib/shopRotation.js` menyimpan `currentStock` di satu variabel modul dan
menjalankan `setInterval` saat file di-`require`. Konsekuensinya: semua guild
melihat stok yang sama, dan `/buy` bisa gagal ("item tidak ada di shop") kalau
rotasi 10 menit kebetulan lewat antara user membuka `/shop` dan menekan
`/buy`.

## 6. Mini boss hanya bisa satu guild

`BOSS_CHANNEL_ID` dibaca sekali dari `.env`, jadi penjadwal hanya pernah spawn
di satu channel/guild. Bot di lebih dari satu server tidak akan punya boss di
server lainnya. Kalau memang multi-guild, channel boss perlu disimpan per guild
di database.

## 7. Balapan update embed boss

`handleBossAttack()` memakai `interaction.update()` pada pesan boss. Dua
serangan yang datang hampir bersamaan bisa membuat embed menampilkan HP yang
lebih tua (bukan salah data — data di SQLite tetap benar, hanya tampilannya
yang bisa mundur sesaat).

## 8. `xp_fill` menggantung kalau `POINT_CHANNEL_ID` diisi

`xp_fill` mengisi XP sampai batas level, tapi kenaikan level baru diproses di
`messageCreate`. Kalau poin dibatasi ke satu channel, user harus chat di
channel itu dulu; di channel lain XP-nya diam saja tanpa penjelasan.

## 9. `/give` dan `/exchange` tanpa batas

Tidak ada pajak, tidak ada limit harian, tidak ada minimum umur akun. Coin dari
akun lain bisa langsung jadi poin leaderboard. Detail dan usulan angkanya ada
di [Balancing.md](Balancing.md).

## 10. Dokumentasi tertinggal

`Docs/Bot.md` bagian "Aturan Angka" belum punya bagian mini boss (sudah
ditambahkan pada update ini), dan `Docs/ToDoV2.md` masih menandai mini boss
sebagai belum digarap padahal sudah jalan.
