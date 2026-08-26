# Ability & Buff

Item di `/inventory` dipakai lewat `/use <id>`. Item habis satu buah, lalu
efeknya jalan. Buff aktif dicek dengan `/buffs`.

## Aturan

- **Common – Rare**: hanya multiplier (Coin, XP, atau Poin) selama beberapa
  menit. Tidak punya ability.
- **Epic – Mythic**: punya ability bernama. Ada yang memasang buff, ada yang
  langsung jalan sekali.
- **Tidak menumpuk.** Buff dengan efek sama memakai pengali terbesar; buff
  lain tetap berjalan waktunya, tapi tidak dijumlahkan.
- **Multiplier coin tidak berlaku di `/give` dan `/exchange`.** Hanya `/daily`,
  hadiah quest, hadiah naik level, dan (nanti) loot boss.
- Ability bertanda **[boss]** baru terasa setelah sistem mini boss ada; buff-nya
  sudah tersimpan sejak sekarang. Lihat [bossplan.md](bossplan.md).

## Multiplier (Common – Rare)

| Tier | Contoh | Efek |
|------|--------|------|
| Common | Rusty Shortsword, Slime Gel | ×1.05 – ×1.10, 20–30 menit |
| Uncommon | Silver Ingot, Glowing Mushroom | ×1.10 – ×1.15, 30–45 menit |
| Rare | Dragon Scale, Quantum Chip | ×1.10 – ×1.25, 60–90 menit, ada yang multi-stat |

## Ability (Epic – Mythic)

| Item | Ability | Efek |
|------|---------|------|
| Blade of Desolation | Sharpened Edge | **[boss]** Damage ke boss ×1.3, 30 menit |
| Void Scepter | Void Grip | **[boss]** Peluang loot boss ×2, 30 menit |
| Meteorite Alloy | Heavy Impact | **[boss]** Jumlah drop boss ×2, 1 kali kill |
| Abyssal Eye | Insight | Progres quest ×2, 1 jam |
| Tears of the Fallen | Second Wind | Reset cooldown `/daily` |
| Blade of the Fallen King | Kingslayer | **[boss]** Damage ke boss ×1.6, 30 menit |
| Phoenix Whisper Bow | Rekindle | Semua buff aktif +30 menit |
| Adamantine Ingot | Sturdy | 3 pemakaian `/use` berikutnya tidak menghabiskan item |
| Leviathan's Scale | Deep Current | Coin dari quest dan boss ×2, 30 menit |
| Holy Grail Fragment | Blessing | XP penuh sampai ambang level berikutnya |
| Starbreaker Claymore | Star Cleave | **[boss]** Damage ke boss ×2, 30 menit |
| Genesis Scepter | Genesis | Coin, XP, dan Poin ×1.5, 1 jam |
| Astral Fragment | Astral Rift | XP seluruh member server ×1.25, 15 menit |
| Heart of the Primordial | Endless Pulse | Buff yang dipasang setelahnya bertahan 25% lebih lama, 3 jam |
| Chrono Core | Time Skip | Reset semua cooldown milikmu + bersihkan semua debuff mini boss |

## Untuk yang menyentuh kode

- Format efek di `src/database/shopCatalog.js`:
  ```jsonc
  { "type": "mult",    "stat": "coin",       "value": 1.25, "durationMs": 3600000 }
  { "type": "ability", "key": "boss_damage", "name": "Kingslayer", "value": 1.6, "durationMs": 1800000 }
  ```
  `stat` boleh array. Efek instan lama (`xp`, `points`) masih didukung.
- Key ability terdaftar di `src/lib/abilities.js`, eksekusinya di
  `src/database/abilities.js`.
- Logika murni buff (aktif, pengali terbesar, format sisa waktu) di
  `src/lib/buffs.js`; penyimpanannya tabel `user_buffs` lewat
  `src/database/buffs.js`.
- Mengalikan reward: `applyBuff(userId, guildId, stat, amount)`.
- 
