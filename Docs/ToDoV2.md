# ToDo v2

Gelombang kedua. Isi [ToDo.md](ToDo.md) yang lama sengaja dibiarkan sebagai
riwayat — yang di bawah ini yang belum digarap sama sekali. (asset rank akan digarap oleh @ferr, Minibos, asset rank, ability,akan digarap oleh @Nekoomaruu)

## Prioritas

- [ ] **Ganti asset rank di kartu.** Logo tier di `assets/ranks/*.png`
  (dipakai `src/cards/rankCard.js` lewat field `rankLogo` dari
  `src/lib/ranks.js`) diganti dengan set gambar baru. Perlu dicek juga:
  ukuran/posisi gambar di kartu `rank` dan `profile`, background
  `assets/rank/Rank.jpeg`, serta emoji tier `tier_*` di `src/lib/emojis.js`
  supaya gaya visualnya tetap satu keluarga.

- [ ] **Tambah quest.** Katalog `QUEST_CATALOG` di `src/lib/quests.js` baru
  berisi 5 quest harian dan 3 mingguan, jadi undian sering mengulang misi yang
  sama. Rencana: tambah tipe quest baru (naik level, belanja sampai nominal
  tertentu, menang/ikut event, klaim streak beruntun, pakai item rarity
  tertentu), plus pertimbangkan quest bulanan dan tingkat kesulitan yang
  hadiahnya menyesuaikan. Tipe baru butuh pemanggil `addQuestProgress()` di
  tempat kejadiannya.

- [ ] **Mini boss spawn jam 00:00 dan 12:00.** Boss muncul otomatis dua kali
  sehari di channel yang ditentukan, member ikut menyerang lewat tombol, dan
  hadiah (coin/poin/item) dibagi ke yang berpartisipasi. Perlu:
  - penjadwal harian yang tahan restart (hitung target waktu berikutnya saat
    boot, bukan `setInterval` polos),
  - konfigurasi `BOSS_CHANNEL_ID` di `.env` dan angka balancing di
    `src/config/constants.js`,
  - tabel baru untuk boss aktif + kontribusi damage per user supaya event
    tidak hilang saat bot mati,
  - katalog boss (nama, HP, gambar, tabel loot) terpisah di `src/lib/`.

- [ ] **Ability/stat per item.** Setiap item punya stat (ATK, DEF, HP, LUCK)
  dan/atau ability yang berlaku saat dipakai atau saat ikut event boss.
  Sekarang kolom `effect` hanya mengenal `xp` dan `points`
  (`src/database/shopCatalog.js`), jadi butuh perluasan format efek, migrasi
  kolom baru, tampilan stat di `/shop`, `/inventory`, dan `/use`, plus
  keputusan apakah item bisa "dipasang" (equip) atau habis sekali pakai.

## Catatan Urutan

Ability/stat item sebaiknya digarap sebelum mini boss, karena sistem boss
paling masuk akal kalau item sudah punya angka yang bisa dipakai bertarung.
Ganti asset rank dan tambah quest berdiri sendiri, bisa dikerjakan kapan saja.
