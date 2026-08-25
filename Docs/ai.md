# ai.md — Basis Pengetahuan Bot (untuk Fitur AI)

Dokumen ini adalah **sumber jawaban** untuk fitur AI di dalam bot. Isinya semua
fitur, aturan angka, dan alur sistem, ditulis supaya bisa langsung dikutip
saat menjawab pertanyaan user ("gimana cara dapat coin?", "kenapa poinku ga
nambah?", dst).

## Cara Memakai Dokumen Ini (untuk AI)

- Jawab **hanya** berdasarkan isi dokumen ini. Kalau tidak ada di sini, bilang
  belum tersedia — jangan mengarang angka, nama item, atau nama command.
- Bahasa jawaban: **Bahasa Indonesia santai**, singkat, langsung ke inti.
- Selalu sebut command dengan format lengkap, misal `/bank deposit <jumlah>`.
- Kalau user tanya sesuatu yang butuh data pribadinya (saldo, level, quest),
  arahkan ke command yang tepat — AI tidak membaca database.
- Fitur bertanda **[belum ada]** adalah rencana; jangan dijanjikan sebagai
  fitur yang bisa dipakai sekarang.

---

## 1. Konsep Dasar

Bot ini adalah bot ekonomi + leveling untuk server komunitas. Ada tiga nilai
yang dipisah sengaja:

| Nilai | Sumber | Bisa ditransfer? | Dipakai untuk |
|---|---|---|---|
| **Poin** | Chat, voice, `/exchange`, naik level, quest | Tidak | Nilai kontribusi, leaderboard |
| **Coin** | `/daily`, naik level, reward quest, `/give` | Ya (`/give`) | Belanja di `/shop` |
| **XP** | Chat, item, ability | Tidak | Menentukan level → tier rank |

Semua data **terpisah per server (guild)**. Saldo di server A tidak terbawa ke
server B.

---

## 2. Daftar Command Lengkap

### Ekonomi
| Command | Fungsi |
|---|---|
| `/balance` | Saldo dompet, bank, dan streak daily |
| `/bank deposit\|withdraw <jumlah>` | Simpan / ambil coin dari bank |
| `/daily` | Klaim reward harian (streak menambah bonus) |
| `/shop` | Stok toko saat ini (10 item, refresh tiap 10 menit); filter `tier:` atau `cari:` |
| `/buy <id>` | Beli item yang sedang ada di stok |
| `/inventory` | Item milikmu, 5 per halaman |
| `/use <id>` | Pakai satu item (efek/buff/ability jalan) |
| `/buffs` | Daftar buff & ability yang sedang aktif beserta sisa waktu |
| `/give <user> <jumlah>` | Transfer coin ke member lain |
| `/exchange <jumlah>` | Tukar coin jadi poin (500 coin = 1 poin) |

### Poin & Progres
| Command | Fungsi |
|---|---|
| `/points` | Total poin, level, tier, progress bar XP |
| `/quest` | Quest harian, mingguan, bulanan + tombol klaim reward |
| `/profile` | Kartu gambar berisi semua statistik |
| `/rank` | Kartu gambar ringkas: level, tier, progres XP |
| `/leaderboard balance\|points\|voice\|rank\|mingguan` | Papan peringkat teks, 10 baris/halaman sampai 50 user |
| `/leaderboard card [kategori]` | Papan peringkat versi gambar, top 10 |

### Umum
| Command | Fungsi |
|---|---|
| `/guide` | Panduan interaktif, dropdown 11 kategori, tombol halaman & tombol tutup |
| `/ping` | Latency websocket bot |
| `/credit` | Tim pembuat bot |
| `/botinfo` | Info teknis: versi Node.js, discord.js, SQLite3, uptime, statistik |

### Admin (khusus Administrator)
| Command | Fungsi |
|---|---|
| `/admin give-coin <user> <jumlah>` | Beri coin (event/hadiah) |
| `/admin reset-user <user> <konfirmasi>` | Hapus semua data user (saldo, poin, level, inventori, quest) |
| `/admin set-level <user> <level>` | Set level manual, XP direset ke 0 |

`/admin` dikunci `setDefaultMemberPermissions(Administrator)` jadi tidak muncul
untuk member biasa. `reset-user` wajib `konfirmasi: true`.

---

## 3. Aturan Angka

### Chat
- Tiap **7 kata = 2 poin**. Sisa kata disimpan (`pendingWords`), tidak hangus.
- **1 XP per kata**, maksimum **20 XP per pesan**.
- Kalau admin mengisi `POINT_CHANNEL_ID`, hanya channel itu yang menghasilkan poin.

### Anti-spam
Pesan **tidak dihitung sama sekali** (tanpa poin, XP, akumulasi kata, progres quest) kalau:
- jaraknya **< 3 detik** dari pesan sebelumnya, atau
- isinya **sama persis** dengan pesan sebelumnya dalam **30 detik**.

### Voice
- Tiap **15 menit = 5 poin**.
- Syarat: minimal **2 manusia tidak deaf** di channel (termasuk dirimu). Sendirian, semua teman deaf, atau di AFK channel = tidak dapat poin.
- Kalau syarat hilang di tengah jalan, waktu layak yang sudah terkumpul dibayar dulu, lalu dijeda.
- Pindah channel tidak memutus sesi. Bot restart tidak menghanguskan sesi (disimpan di `voice_sessions`).
- Total jam voice untuk leaderboard tetap mencatat semua waktu, walau tidak layak poin.

### Level
- XP untuk naik dari level N = **N × 100**.
- Reward naik level: **level × 10 poin**, **level × 50 coin**, dan peluang item acak **10% + level × 1%** (maks 50%).
- Kalau `LEVEL_ROLES` diisi admin, role otomatis diberikan.

### Tier Rank
| Tier | Mulai level |
|---|---|
| Novice | 1 |
| Apprentice | 6 |
| Adept | 11 |
| Veteran | 21 |
| Champion | 36 |
| Hero | 51 |
| Demigod | 71 |

### Daily
- Klaim pertama **500 coin**, tiap hari berturut-turut **+100 coin**.
- Perbandingan pakai **tanggal kalender**, bukan selisih 24 jam. Klaim jam 23.00 lalu 07.00 besoknya = streak lanjut.
- Bolong sehari → streak balik ke 1.

### Exchange
`500 coin = 1 poin`. Satu arah (coin → poin).

---

## 4. Shop, Item & Rarity

- Stok **10 item**, diundi ulang tiap **10 menit**. Stok hidup di memori → bot restart = undian baru.
- Peluang muncul mengikuti bobot rarity:

| Rarity | Bobot | Warna |
|---|---|---|
| Common | 30 | abu |
| Uncommon | 25 | hijau |
| Rare | 20 | biru |
| Epic | 12 | ungu |
| Legendary | 8 | oranye |
| Mythic | 5 | merah |

- Tampilan `/shop`: ikon per item, badge rarity, harga dengan tanda cukup/tidak cukup saldo, efek item, deskripsi, dan `/buy <id>` siap salin. Header berisi saldo, hitung mundur refresh, dan filter aktif. Ada select menu tier di pesan. Urutan: rarity tertinggi lalu harga termahal.
- Item hilang sebelum sempat dibeli itu **normal** (refresh 10 menit); `/buy` selalu memvalidasi ke stok aktif.

### Daftar item per rarity
- **Common:** Rusty Shortsword, Apprentice Wand, Iron Ore, Slime Gel, Tattered Parchment
- **Uncommon:** Steel Broadsword, Ranger's Bow, Silver Ingot, Glowing Mushroom, Beast Fang
- **Rare:** Plasma Blaster, Crystal Dagger, Stardust Core, Dragon Scale, Quantum Chip
- **Epic:** Blade of Desolation, Void Scepter, Meteorite Alloy, Abyssal Eye, Tears of the Fallen
- **Legendary:** Blade of the Fallen King, Phoenix Whisper Bow, Adamantine Ingot, Leviathan's Scale, Holy Grail Fragment
- **Mythic:** Starbreaker Claymore, Genesis Scepter, Astral Fragment, Heart of the Primordial, Chrono Core

---

## 5. Ability & Buff

Item dipakai lewat `/use <id>`: item berkurang satu, lalu efeknya jalan.
Cek yang sedang aktif dengan `/buffs`.

### Aturan
- **Common – Rare**: hanya multiplier (Coin, XP, atau Poin) selama beberapa menit. Tidak punya ability bernama.
  - Common: ×1.05 – ×1.10, 20–30 menit
  - Uncommon: ×1.10 – ×1.15, 30–45 menit
  - Rare: ×1.10 – ×1.25, 60–90 menit, ada yang multi-stat
- **Epic – Mythic**: punya **ability bernama**; ada yang memasang buff, ada yang instan.
- **Buff tidak menumpuk.** Efek yang sama memakai **pengali terbesar**; buff lain tetap berjalan waktunya tapi tidak dijumlahkan.
- **Multiplier coin tidak berlaku di `/give` dan `/exchange`.** Hanya `/daily`, reward quest, reward naik level, dan (nanti) loot boss.

### Tabel ability Epic–Mythic
| Item | Ability | Efek |
|---|---|---|
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
| Chrono Core | Time Skip | Reset semua cooldown milikmu |

Ability bertanda **[boss]** buff-nya sudah tersimpan sekarang, tapi baru terasa
setelah sistem mini boss ada — **[belum ada]**.

---

## 6. Quest

- Tiap user dapat **2 quest harian + 1 mingguan + 1 bulanan**, diundi saat
  pertama kali menyentuh periode itu.
- Periode: harian = tanggal UTC, mingguan = nomor pekan ISO (reset Senin),
  bulanan = `YYYY-MM` UTC.
- Progres terisi **otomatis** dari aktivitas: chat yang lolos anti-spam, detik
  voice saat sesi berakhir, klaim `/daily`, belanja `/buy`, `/use` (ada varian
  per rarity), `/give`, dan naik level.
- Quest streak memakai **nilai tertinggi**, bukan penjumlahan.
- Reward coin **diklaim manual** lewat tombol di `/quest`. Tombolnya tetap
  berfungsi setelah bot restart.

### Katalog quest
**Harian:** Ngobrol 15 pesan (400), Nongkrong 30 menit di voice (500), Klaim `/daily` (250), Pakai satu item (300), Beli satu item (300), Belanja 2.000 coin (400), Klaim daily hari ini/streak (300).

**Mingguan:** 100 pesan (3.000), Voice 3 jam (3.500), `/give` 5 kali (2.500), Naik 3 level (3.000), Belanja 15.000 coin (2.500), Pakai item Epic (2.200), Pakai item Legendary (4.000).

**Bulanan:** 500 pesan (10.000), Voice 12 jam (12.000), Belanja 60.000 coin (9.000), Naik 8 level (15.000), Streak daily 14 hari (8.000).

Quest tipe "ikut/menang event" **[belum ada]** — menunggu sistem event/boss.

---

## 7. Leaderboard

- Kategori: `balance`, `points`, `voice` (total jam voice), `rank`, `mingguan`.
- Versi teks: 10 baris per halaman, sampai 50 user, dengan tombol halaman.
- Versi gambar: `/leaderboard card [kategori]`, top 10.
- `mingguan` = poin yang didapat pekan berjalan (kunci pekan ISO sama dengan
  quest mingguan, reset tiap Senin). Riwayat pekan lama disimpan.

---

## 8. Panduan Dalam Bot (`/guide`)

11 halaman: Beranda, Ekonomi, Poin & Level, Aktivitas, Quest, Rank Tier,
Item & Rarity, Reward, Utilitas, Admin, Tips. Navigasi lewat dropdown
kategori + tombol halaman sebelumnya/berikutnya, dan tombol tutup.

---

## 9. Tampilan & Emoji

Semua ikon memakai custom emoji terpusat. Yang perlu diketahui user:
- Pager `/guide`, `/inventory`, `/leaderboard`, `/shop` pakai tombol Back/Next.
- `/guide` punya tombol tutup (animasi cancel).
- `/quest` punya ikon quest sendiri.
- Ability pakai ikon ability universal; buff pakai ikon buff, dan baris buff
  yang sedang aktif pakai ikon animasi.
- Emoji boss sudah terdaftar tapi **belum dipakai** — menunggu sistem boss.
- Kalau muncul teks mentah seperti `<:coin:123>`, artinya ID emoji salah atau
  emoji sudah dihapus dari aplikasi. Bot punya fallback unicode kalau ID kosong.

---

## 10. Sistem yang Belum Ada

- **Mini boss** — [belum ada]. Semua ability bertanda [boss] belum terasa efeknya.
- **Quest event** — [belum ada].
- Jangan menjanjikan tanggal rilis.

---

## 11. Jawaban Cepat (FAQ)

**"Gimana cara dapat coin?"** → `/daily` tiap hari, naik level, klaim reward `/quest`, atau minta `/give` dari teman. Poin tidak bisa jadi coin; hanya coin → poin lewat `/exchange`.

**"Kenapa poinku nggak nambah pas chat?"** → Kemungkinan kena anti-spam (jarak <3 detik atau pesan sama persis dalam 30 detik), belum genap 7 kata (sisanya disimpan, tidak hangus), atau admin mengunci poin ke satu channel tertentu.

**"Kenapa voice-ku nggak dapat poin?"** → Harus ada minimal 2 orang tidak deaf di channel, dan bukan AFK channel. Poin masuk tiap kelipatan 15 menit yang layak.

**"Streak daily-ku hilang?"** → Streak reset kalau bolong satu hari kalender. Klaim tiap hari, jam bebas.

**"Item di shop hilang sebelum kubeli."** → Stok refresh tiap 10 menit; tunggu undian berikutnya.

**"Buff-ku kok nggak dobel?"** → Buff dengan efek sama tidak menumpuk; yang dipakai pengali terbesar. Cek `/buffs`.

**"Coin dari `/give` kok nggak kena multiplier?"** → Multiplier coin memang tidak berlaku di `/give` dan `/exchange`.

**"Gimana cara naik tier?"** → Tier ditentukan level: Novice 1, Apprentice 6, Adept 11, Veteran 21, Champion 36, Hero 51, Demigod 71. Cek `/rank` atau `/points`.

**"Data-ku hilang pas pindah server?"** → Data dipisah per server, memang tidak terbawa.

**"Command bot nggak muncul."** → Itu urusan admin: command harus dideploy ulang; command global butuh waktu menyebar.

