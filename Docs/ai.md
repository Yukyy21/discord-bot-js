# ai.md — Basis Pengetahuan Bot (untuk Fitur AI)

Dokumen ini adalah **sumber jawaban** untuk fitur AI di dalam bot. Isinya semua
fitur, aturan angka, dan alur sistem, ditulis supaya bisa langsung dikutip
saat menjawab pertanyaan user ("gimana cara dapat coin?", "kenapa poruv-ku ga
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
| **Poruv** | Chat, voice, naik level, quest, mini boss | Tidak | Nilai kontribusi, leaderboard, belanja di `/poruv-shop` |
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
| `/equip equip\|unequip <id>` | Pasang / lepas item ke slot equip (maks 5); penanda build, efek tetap via /use |
| `/buffs` | Daftar buff & ability yang sedang aktif beserta sisa waktu |
| `/give <user> <jumlah>` | Transfer coin ke member lain |

### Poruv & Progres
| Command | Fungsi |
|---|---|
| `/points` | Total Poruv, level, tier, progress bar XP |
| `/poruv-shop` | Tukar Poruv jadi Owocash, e-wallet, custom role, atau item Mythic acak |
| `/quest` | Quest harian, mingguan, bulanan + tombol klaim reward |
| `/profile` | Kartu gambar berisi semua statistik |
| `/rank` | Kartu gambar ringkas: level, tier, progres XP |
| `/leaderboard balance\|points\|voice\|rank\|mingguan` | Papan peringkat teks, 10 baris/halaman sampai 50 user |
| `/leaderboard card [kategori]` | Papan peringkat versi gambar, top 10 |

### Umum
| Command | Fungsi |
|---|---|
| `/ai-ask <input>` | Tanya apa saja soal bot; jawaban bersumber dari dokumen ini |
| `/guide` | Panduan interaktif, dropdown 11 kategori, tombol halaman & tombol tutup |
| `/ping` | Latency websocket bot |
| `/credit` | Tim pembuat bot |
| `/botinfo` | Info teknis: versi Node.js, discord.js, SQLite3, uptime, statistik |

### Admin (khusus Administrator)
| Command | Fungsi |
|---|---|
| `/admin give-coin <user> <jumlah>` | Beri coin (event/hadiah) |
| `/admin reset-user <user> <konfirmasi>` | Hapus semua data user (saldo, Poruv, level, inventori, quest) |
| `/admin set-level <user> <level>` | Set level manual, XP direset ke 0 |
| `/admin-spawn-boss` | Paksa boss diundi sekarang (buat tes) |

`/admin` dikunci `setDefaultMemberPermissions(Administrator)` jadi tidak muncul
untuk member biasa. `reset-user` wajib `konfirmasi: true`.

---

## 3. Aturan Angka

### Chat
- Tiap **7 kata = 2 Poruv**. Sisa kata disimpan (`pendingWords`), tidak hangus.
- **1 XP per kata**, maksimum **20 XP per pesan**.
- Maksimum **200 XP per menit** per user (jendela bergulir 60 detik). Chat
  aktif normal hampir tidak pernah menyentuhnya; spam yang rajin justru cepat
  kena plafon.
- Kalau admin mengisi `POINT_CHANNEL_ID`, hanya channel itu yang menghasilkan Poruv.

### Anti-spam
Pesan **tidak dihitung sama sekali** (tanpa Poruv, XP, akumulasi kata, progres quest) kalau:
- jaraknya **< 3 detik** dari pesan sebelumnya, atau
- isinya **sama persis** dengan pesan sebelumnya dalam **30 detik**.

### Voice
- Tiap **15 menit = 5 Poruv**.
- Syarat: minimal **2 manusia tidak deaf** di channel (termasuk dirimu). Sendirian, semua teman deaf, atau di AFK channel = tidak dapat Poruv.
- Kalau syarat hilang di tengah jalan, waktu layak yang sudah terkumpul dibayar dulu, lalu dijeda.
- Pindah channel tidak memutus sesi. Bot restart tidak menghanguskan sesi (disimpan di `voice_sessions`).
- Total jam voice untuk leaderboard tetap mencatat semua waktu, walau tidak layak Poruv.

### Level
- XP untuk naik dari level N = **N × 100**.
- Reward naik level: **level × 10 Poruv**, **level × 50 coin**, dan peluang item acak **10% + level × 1%** (maks 50%).
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

---

## 3b. Poruv Shop

`/poruv-shop` adalah tempat membelanjakan **Poruv** (bukan coin). Berbeda dari
`/shop`, item di sini **bukan barang virtual dalam game** — semuanya bernilai
di luar bot, jadi **hampir semua diproses manual oleh admin**, kecuali item
Mythic yang otomatis masuk `/inventory` lewat sistem yang sama dengan `/shop`.

### Cara kerja klaim
1. User pilih item lewat tombol di `/poruv-shop`.
2. Poruv langsung terpotong dan klaim tercatat.
3. Untuk Owocash / e-wallet / custom role: klaim berstatus **pending**, dan
   bot mengirim **DM** ke tiap member yang punya salah satu role di
   `ADMIN_ROLE_IDS` (`.env`, comma-separated). Admin memproses manual di luar
   bot. Kalau `ADMIN_ROLE_IDS` kosong, tidak ada notifikasi terkirim — klaim
   tetap tercatat di database, cuma tidak ada yang diberi tahu otomatis.
4. Untuk item Mythic: langsung digenapi otomatis, statusnya **fulfilled**
   seketika, tanpa menunggu admin, tanpa DM.

### Daftar item

| Item | Harga | Fulfillment |
|---|---|---|
| Item Mythic (Acak) | **2.500 Poruv** | Otomatis — 1 item Mythic acak dari katalog `/shop`, langsung masuk `/inventory` |
| Owocash 1.000.000 | **5.000 Poruv** | Manual — transfer 1.000.000 Owocash (OwO bot), diproses admin |
| Custom Role | **10.000 Poruv** | Manual — role custom (nama & warna sesuai request), dibuatkan admin |
| E-Wallet 25.000 | **15.000 Poruv** | Manual — saldo e-wallet Rp25.000, dikirim admin |

### Perkiraan waktu tebus
Harga ditentukan langsung oleh owner. Sebagai gambaran kasar, dengan proyeksi
Poruv dua profil user — **santai** (±76 Poruv/hari) dan **grinding**
(±524 Poruv/hari) — waktu tebus tiap item kira-kira:

| Item | Grinding | Santai |
|---|---|---|
| Item Mythic (Acak) | ±5 hari | ±33 hari (±1,1 bulan) |
| Owocash 1.000.000 | ±10 hari | ±66 hari (±2,2 bulan) |
| Custom Role | ±19 hari | ±132 hari (±4,4 bulan) |
| E-Wallet 25.000 | ±29 hari | ±197 hari (±6,6 bulan) |

Catatan: E-Wallet 25.000 sengaja jadi item termahal meski nilainya konkret
(uang beneran nominal kecil), karena redeem-nya paling berat diproses admin
dibanding tiga item lain.

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
- **Common – Rare**: hanya multiplier (Coin, XP, atau Poruv) selama beberapa menit. Tidak punya ability bernama.
  - Common: ×1.05 – ×1.10, 20–30 menit
  - Uncommon: ×1.10 – ×1.15, 30–45 menit
  - Rare: ×1.10 – ×1.25, 60–90 menit, ada yang multi-stat
- **Epic – Mythic**: punya **ability bernama**; ada yang memasang buff, ada yang instan.
- **Buff tidak menumpuk.** Efek yang sama memakai **pengali terbesar**; buff lain tetap berjalan waktunya tapi tidak dijumlahkan.
- **Multiplier coin tidak berlaku di `/give` dan `/exchange`.** Hanya `/daily`, reward quest, reward naik level, dan (nanti) loot boss.
- **`/give` kena biaya 5%** (`GIVE_FEE_RATE`). Biaya dipotong dari saldo pengirim dan **dibakar** (penerima dapat penuh) — inilah sink coin utama bot.

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
| Adamantine Ingot | Sturdy | 3 pemakaian `/use` berikutnya tidak menghabiskan item (ingot itu sendiri selalu terpakai; charge dari beberapa ingot digabung jadi satu sisa jatah) |
| Leviathan's Scale | Deep Current | Coin dari quest dan boss ×2, 30 menit |
| Holy Grail Fragment | Blessing | XP penuh sampai ambang level berikutnya |
| Starbreaker Claymore | Star Cleave | **[boss]** Damage ke boss ×2, 30 menit |
| Genesis Scepter | Genesis | Coin, XP, dan Poruv ×1.5, 1 jam |
| Astral Fragment | Astral Rift | XP seluruh member server ×1.25, 15 menit |
| Heart of the Primordial | Endless Pulse | Buff yang dipasang setelahnya bertahan 25% lebih lama, 3 jam |
| Chrono Core | Time Skip | Reset semua cooldown milikmu |

Ability bertanda **[boss]** sudah benar-benar terasa di sistem mini boss:
`boss_damage` menaikkan damage per klik, `boss_loot_rate` peluang drop, dan
`boss_drop_amount` jumlah item yang jatuh.

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

Quest event sudah ada: `boss_join` (harian, ikut serang mini boss) dan
`boss_kill` (mingguan, ikut menumbangkan mini boss).

---

## 6b. Mini Boss

- Boss diundi otomatis tiap **12:00** dan **20:00** waktu lokal event
  (offset `BOSS_UTC_OFFSET`, default WIB) lalu dikirim ke channel mini boss
  server masing-masing (channel per-guild diatur admin lewat `/boss-channel`;
  fallback `BOSS_CHANNEL_ID`).
  Admin bisa memaksa lewat `/admin-spawn-boss`.
- Cara ikut: klik tombol **Serang!** di pesan boss. Player tidak punya HP, jadi
  tidak ada risiko mati. Jeda antar serangan **10 detik** per orang (bisa molor
  kalau kena debuff cooldown dari boss).
- Boss kabur kalau belum tumbang dalam **6 jam** — hadiah tidak dibagikan.
- Hadiah: **60% pool** dibagi proporsional damage ke semua peserta, sisa 40% jadi
  bonus **top 3 damager** (15% / 10% / 5%) dan **pemberi last hit** (10%) — satu
  orang boleh kena dua jatah. Minimal **3 peserta**; kalau kurang, hadiah tidak
  dibagikan. Hadiah berupa coin, XP, Poruv, plus peluang item dari loot table.

### Daftar boss

| Boss | Peluang muncul | HP | Ikon |
|---|---|---|---|
| **Pump Freakin** | 45% | 24.000 | labu raksasa berkepala jahitan |
| **Clown Orca** | 45% | 30.000 | badut merah bertopi lonceng |
| **Ancient Mummy** | 10% (boss spesial) | 60.000 | mumi kuno |

### Boss Menyerang Balik

Boss **tidak bisa membunuh** player — player tetap tanpa HP. Yang dilakukan
boss adalah memasang **debuff** atau merampas coin di dompet (bank aman).

Dua cara boss menyerang:
1. **Serangan balik** — tiap kali kamu klik **Serang!**, ada peluang boss
   membalas: Pump Freakin **25%**, Clown Orca **30%**, Ancient Mummy **40%**.
2. **Amukan** — tiap **5 menit** boss menyerang sampai **3 penyerang teraktif**
   (yang menyerang dalam 15 menit terakhir) sekaligus, diumumkan di channel boss.

#### Daftar serangan boss
| Serangan | Efek | Dipakai boss |
|---|---|---|
| Rantai Berat | Cooldown serang ×2, 5 menit | Pump Freakin, Clown Orca |
| Belenggu Kutukan | Cooldown serang ×3, 5 menit | Ancient Mummy |
| Aura Melemahkan | Damage ke boss ×0.65, 5 menit | Pump Freakin |
| Kutukan Serakah | Peluang loot boss ×0.5, 15 menit | Clown Orca, Ancient Mummy |
| Debu Kabur | XP didapat ×0.75, 15 menit | Clown Orca |
| Kutukan Bisu | Poruv didapat ×0.8, 10 menit | Ancient Mummy |
| Pukulan Linglung | 1 serangan berikutnya meleset (0 damage) | Pump Freakin, Clown Orca |
| Rampas Koin | 3% coin dompet hilang (maks 1.500) | Pump Freakin, Clown Orca |
| Perampokan Makam | 6% coin dompet hilang (maks 5.000) | Ancient Mummy |
| Tanda Kutukan | Cooldown ×2.5 **dan** damage ×0.7, 10 menit | Ancient Mummy |

#### Aturan debuff (biar tidak bentrok dengan item)
- Debuff **tidak pernah membatalkan ability item**. Buff item dihitung dulu,
  debuff mengalikan hasil akhirnya. Contoh: Kingslayer ×1.6 lalu Aura
  Melemahkan ×0.65 = ×1.04.
- **Debuff sejenis tidak menumpuk** — dipakai yang paling parah (sama seperti
  buff yang memakai pengali terbesar).
- Debuff **tidak** diperpanjang Endless Pulse dan **tidak** ikut Rekindle;
  kedua ability itu hanya menyentuh buff milikmu.
- **Chrono Core (Time Skip)** membersihkan semua debuff boss sekaligus mereset
  cooldown. Ini satu-satunya cara instan lepas dari kutukan.
- Debuff yang sedang aktif tampil di `/buffs` di bagian **Debuff dari Mini Boss**.
- Coin yang dirampas hanya diambil dari **dompet**, tidak dari **bank**.

Tiap boss punya **gambar ikon sendiri** yang tampil sebagai thumbnail di embed
boss: saat muncul, tiap serangan, saat tumbang, dan saat kabur. Kalau file
ikonnya hilang, embed tetap terkirim — hanya tanpa gambar.

---

## 7. Leaderboard

- Kategori: `balance`, `points`, `voice` (total jam voice), `rank`, `mingguan`.
- Versi teks: 10 baris per halaman, sampai 50 user, dengan tombol halaman.
- Versi gambar: `/leaderboard card [kategori]`, top 10.
- `mingguan` = Poruv yang didapat pekan berjalan (kunci pekan ISO sama dengan
  quest mingguan, reset tiap Senin). Riwayat pekan lama disimpan.

---

## 8. Panduan Dalam Bot (`/guide`)

11 halaman: Beranda, Ekonomi, Poruv & Level, Aktivitas, Quest, Rank Tier,
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
- Mini boss punya emoji sendiri (`boss`, `boss_hp`, `boss_loot`, `boss_hit`) dan
  **gambar ikon per boss** yang jadi thumbnail embed (file di `assets/boss/`).
- Kalau muncul teks mentah seperti `<:coin:123>`, artinya ID emoji salah atau
  emoji sudah dihapus dari aplikasi. Bot punya fallback unicode kalau ID kosong.

---

## 10. Sistem yang Belum Ada

- Mini boss dan quest event **sudah rilis** (lihat bagian 6b).
- Kalau user menanyakan fitur yang tidak ada di dokumen ini, bilang belum
  tersedia dan jangan menjanjikan tanggal rilis.

---

## 11. Jawaban Cepat (FAQ)

**"Gimana cara dapat coin?"** → `/daily` tiap hari, naik level, klaim reward `/quest`, atau minta `/give` dari teman. Poruv tidak bisa jadi coin, dan sebaliknya juga tidak bisa — keduanya benar-benar terpisah.

**"Kenapa Poruv-ku nggak nambah pas chat?"** → Kemungkinan kena anti-spam (jarak <3 detik atau pesan sama persis dalam 30 detik), belum genap 7 kata (sisanya disimpan, tidak hangus), atau admin mengunci Poruv ke satu channel tertentu.

**"Kenapa voice-ku nggak dapat Poruv?"** → Harus ada minimal 2 orang tidak deaf di channel, dan bukan AFK channel. Poruv masuk tiap kelipatan 15 menit yang layak.

**"Streak daily-ku hilang?"** → Streak reset kalau bolong satu hari kalender. Klaim tiap hari, jam bebas.

**"Item di shop hilang sebelum kubeli."** → Stok refresh tiap 10 menit; tunggu undian berikutnya.

**"Buff-ku kok nggak dobel?"** → Buff dengan efek sama tidak menumpuk; yang dipakai pengali terbesar. Cek `/buffs`.

**"Coin dari `/give` kok nggak kena multiplier?"** → Multiplier coin memang tidak berlaku di `/give`.

**"Poruv-ku dipakai buat apa?"** → Belanja di `/poruv-shop`: Item Mythic acak (2.500 Poruv), Owocash 1.000.000 (5.000 Poruv), Custom Role (10.000 Poruv), atau E-Wallet 25.000 (15.000 Poruv).

**"Kok item dari `/poruv-shop` nggak langsung kukirim?"** → Wajar untuk Owocash, e-wallet, dan custom role — ketiganya diproses manual oleh admin setelah klaim (bot DM admin otomatis), bukan otomatis dari bot. Hanya item Mythic yang langsung masuk `/inventory`.

**"Gimana cara naik tier?"** → Tier ditentukan level: Novice 1, Apprentice 6, Adept 11, Veteran 21, Champion 36, Hero 51, Demigod 71. Cek `/rank` atau `/points`.

**"Data-ku hilang pas pindah server?"** → Data dipisah per server, memang tidak terbawa.

**"Kenapa tombol serang boss-ku lama banget?"** → Cooldown normalnya 10 detik. Kalau lebih lama, kamu kena debuff cooldown dari serangan balik boss (×2, ×2.5, atau ×3). Cek `/buffs`, atau pakai Chrono Core untuk membersihkannya.

**"Boss bisa bunuh aku nggak?"** → Tidak. Player tidak punya HP. Boss cuma memasang debuff atau merampas sebagian coin di dompet (bank aman).

**"Coin-ku tiba-tiba berkurang pas lawan boss."** → Itu serangan Rampas Koin / Perampokan Makam. Simpan coin di `/bank` sebelum ikut boss kalau tidak mau kena.

**"Debuff-ku numpuk nggak?"** → Tidak. Debuff sejenis memakai efek terparah saja, dan buff item tidak pernah dibatalkan — hanya dikalikan setelahnya.

**"Ikon/gambar boss-nya kok nggak muncul?"** → Gambar boss dikirim sebagai lampiran pesan. Kalau tidak muncul, biasanya bot tidak punya izin **Attach Files** di channel mini boss.

**"Command bot nggak muncul."** → Itu urusan admin: command harus dideploy ulang; command global butuh waktu menyebar.

