# Boss Plan

Catatan untuk yang nanti menggarap mini boss. Sistem ability sudah jadi, tapi
empat efek di bawah ini belum ada yang membacanya karena bossnya belum ada.
Buff-nya sudah tersimpan di tabel `user_buffs` begitu item dipakai, jadi sistem
boss tinggal membaca pengalinya.

## Buff yang harus dibaca sistem boss

| Key buff | Item sumber | Arti | Dipakai saat |
|----------|-------------|------|--------------|
| `boss_damage` | Blade of Desolation ×1.3, Blade of the Fallen King ×1.6, Starbreaker Claymore ×2 | Damage serangan user dikali | tiap tombol serang ditekan |
| `boss_loot_rate` | Void Scepter ×2 | Peluang boss menjatuhkan item dikali | saat undian loot |
| `boss_drop_amount` | Meteorite Alloy ×2 | Jumlah item yang didrop dikali | saat boss mati, sekali pakai |
| `quest_coin` | Leviathan's Scale ×2 | Coin dari boss dikali | saat bagi hadiah coin |

Cara membacanya:

```js
const { getMultiplier, applyBuff, consumeCharge } = require('../database');

const damage = Math.round(baseDamage * getMultiplier(userId, guildId, 'boss_damage'));
const coin = applyBuff(userId, guildId, 'quest_coin', baseCoin);
```

## Aturan yang harus diikuti

- **Damage dihitung saat serangan terjadi**, bukan saat boss mati. Buff 30 menit
  tidak boleh menguntungkan orang yang menyerang sebelum buff dipasang.
- **`boss_drop_amount` berbasis jatah, bukan waktu.** Baris buff-nya punya
  `charges: 1` dan `expiresAt` null. Habiskan dengan
  `consumeCharge(userId, guildId, 'boss_drop_amount')` tepat sekali, saat boss
  yang bersangkutan mati, bukan tiap serangan.
- **Multiplier coin biasa (`coin`) juga berlaku untuk loot boss**, sama seperti
  `/daily` dan quest. Ambil yang terbesar antara `coin` dan `quest_coin`, jangan
  dikalikan dua-duanya:
  ```js
  const mult = Math.max(getMultiplier(u, g, 'coin'), getMultiplier(u, g, 'quest_coin'));
  ```
- **Buff sejenis tidak menumpuk.** Tiga item damage yang dipakai bersamaan tetap
  memberi pengali terbesar saja — ini sudah ditangani `getMultiplier()`, jangan
  dijumlahkan manual.
- **XP dan poin dari boss** pakai `applyBuff(..., 'xp' | 'points', jumlah)`
  supaya buff Genesis dan Astral Rift ikut terhitung.

## Yang perlu ditambahkan di sisi boss

- Tabel boss aktif + kontribusi damage per user (tahan restart).
- Katalog boss di `src/lib/`: nama, HP, gambar, tabel loot. Kolom loot boleh
  merujuk `id` item di `src/database/shopCatalog.js`.
- Emoji boss di `src/lib/emojis.js` (mis. key `boss`, `boss_hit`) supaya embed
  serangan dan pengumuman spawn satu gaya dengan command lain.
- Quest tipe "ikut/menang event" yang sudah lama menunggu di `ToDoV2.md`:
  panggil `addQuestProgress(userId, guildId, 'boss_join' | 'boss_kill', 1)`.
- Kalau boss menjatuhkan item, pakai `grantItem()` yang sudah ada.

## Balancing yang perlu diperhatikan

Damage maksimum satu orang saat ini bisa ×2 (Star Cleave). Drop bisa ×2 jumlah
dan ×2 peluang sekaligus kalau dua item dipakai bersamaan, dan coin boss bisa
×2 dari Deep Current. Set HP boss dan tabel loot dengan asumsi pemain aktif
memakai kombinasi ini, bukan asumsi tanpa buff.

