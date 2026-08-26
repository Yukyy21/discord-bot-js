# Cara Kerja Bot

Dokumen ini menjelaskan apa yang dilakukan bot, aturan angkanya, dan bagaimana
kodenya disusun. Untuk cara menjalankan, lihat [README](../README.md).

## Gambaran Singkat

Ada dua mata uang yang sengaja dipisah:

- **Poin** — nilai "kontribusi". Didapat dari aktivitas: ngobrol dan duduk di
  voice channel. Tidak bisa ditransfer antar user.
- **Coin** — mata uang belanja. Didapat dari `/daily`, hadiah naik level, atau
  tukar poin. Bisa ditransfer lewat `/give` dan dipakai di `/shop`.

Selain itu ada **XP** yang menentukan level, dan level menentukan **tier rank**
(Novice sampai Demigod).

Semua data disimpan per server. Member yang aktif di dua server punya saldo dan
level yang terpisah.

## Daftar Command

### Ekonomi

| Command | Fungsi |
|---|---|
| `/balance` | Saldo dompet, bank, dan streak daily |
| `/bank deposit\|withdraw <jumlah>` | Simpan / ambil coin dari bank |
| `/daily` | Klaim reward harian; makin panjang streak makin besar |
| `/shop` | Stok toko saat ini (10 item, berganti tiap 10 menit); bisa disaring per tier (`tier:`) atau dicari per nama (`cari:`) |
| `/buy <id>` | Beli item yang sedang ada di stok |
| `/inventory` | Item yang kamu punya, 5 per halaman |
| `/use <id>` | Pakai satu buah item yang punya efek |
| `/give <user> <jumlah>` | Transfer coin ke member lain |
| `/exchange <jumlah>` | Tukar coin jadi poin (500 coin = 1 poin) |

### Poin & Progres

| Command | Fungsi |
|---|---|
| `/points` | Total poin, level, tier, dan progress bar XP |
| `/quest` | Quest harian, mingguan & bulanan: progres dan tombol klaim reward |
| `/profile` | Kartu gambar berisi semua statistik |
| `/rank` | Kartu gambar ringkas: level, tier, progres XP |
| `/leaderboard balance\|points\|voice\|rank\|mingguan` | Papan peringkat teks, 10 baris per halaman sampai 50 user; `mingguan` = poin yang didapat pekan ini |
| `/leaderboard card [kategori]` | Papan peringkat versi gambar, top 10 |

### Umum

| Command | Fungsi |
|---|---|
| `/guide` | Panduan interaktif dengan dropdown kategori (11 halaman: Beranda, Ekonomi, Poin & Level, Aktivitas, Quest, Rank Tier, Item & Rarity, Reward, Utilitas, Admin, Tips) |
| `/ping` | Latency websocket bot |
| `/credit` | Tim yang membangun bot beserta perannya |
| `/botinfo` | Info teknis: versi Node.js, discord.js, SQLite3, uptime, statistik |
| `/ai-ask <input>` | Tanya apa saja soal bot; dijawab AI berdasarkan `Docs/ai.md` |

| `/admin give-coin <user> <jumlah>` | **Admin:** beri coin ke user (event/hadiah) |
| `/admin reset-user <user> <konfirmasi>` | **Admin:** hapus semua data user — saldo, poin, level, inventori, quest |
| `/admin set-level <user> <level>` | **Admin:** atur level user manual; XP di-reset ke 0 di level baru |

## Aturan Angka

Semua nilai di bawah ada di `src/config/constants.js` — itu satu-satunya tempat
yang perlu diubah kalau mau balancing ulang.

**Chat.** Tiap 7 kata bernilai 2 poin. Sisa kata yang belum genap disimpan di
kolom `pendingWords`, jadi chat pendek tetap terakumulasi dan tidak hangus.
XP-nya 1 per kata dengan batas 20 XP per pesan, supaya menempel satu paragraf
panjang tidak lebih untung daripada ngobrol normal.

Kalau `POINT_CHANNEL_ID` diisi di `.env`, semua ini hanya berlaku di channel itu.

**Anti-spam.** Pesan yang datang kurang dari 3 detik sejak pesan sebelumnya,
atau yang isinya sama persis dengan pesan sebelumnya dalam 30 detik, tidak
dihitung sama sekali — tanpa poin, XP, maupun akumulasi kata. Logikanya ada
di `src/lib/antispam.js`; daftar pesan terakhir disimpan di memori dengan
batas 1000 user, jadi restart bot menghapus riwayat spam (tidak masalah; ini
penyaring, bukan data ekonomi).

**Voice.** Tiap 15 menit di voice channel bernilai 5 poin, dengan syarat
channel berisi minimal dua manusia yang tidak deaf — user yang dinilai ikut
terhitung, jadi duduk berdua sudah cukup. AFK channel tidak pernah dihitung.
Kalau syarat hilang di tengah jalan (teman keluar atau semua deaf), sisa masa
layak dibayar seketika lalu penghitungan dijeda sampai syarat terpenuhi lagi;
waktu sendirian tidak pernah menumpuk jadi poin. Total durasi untuk
leaderboard jam voice tetap mencatat semua waktu di voice. Pindah channel
tidak memutus sesi, tapi kelayakan dievaluasi ulang. Sesi berjalan dicerminkan
ke tabel `voice_sessions` (write-through), jadi kalau bot mati di tengah sesi,
waktu sebelum mati dilanjutkan saat boot — bukan hangus. Baris untuk user yang
sudah keluar voice selama bot mati dibuang otomatis saat restore.

**Level.** XP yang dibutuhkan untuk naik dari level N adalah `N × 100`. Naik
level memberi `level × 10` poin, `level × 50` coin, dan peluang item acak dari
katalog sebesar `10% + level × 1%` (maksimum 50%). Kalau `LEVEL_ROLES` di
`src/config/index.js` diisi, role juga otomatis diberikan.

**Tier rank.** Novice (Lv 1), Apprentice (6), Adept (11), Veteran (21),
Champion (36), Hero (51), Demigod (71). Diatur di `src/lib/ranks.js`.

**Daily.** Klaim pertama 500 coin, tiap hari berturut-turut menambah 100 coin.
Perbandingan hari memakai tanggal kalender, bukan selisih 24 jam — klaim jam
23.00 lalu jam 07.00 besoknya tetap dihitung streak. Bolong sehari, streak
kembali ke 1.

**Shop.** Stok berisi 10 item yang diundi ulang tiap 10 menit. Peluang muncul
ditentukan rarity: Common 30, Uncommon 25, Rare 20, Epic 12, Legendary 8,
Mythic 5. Rarity tiap item bawaan mengikuti daftar resmi di
`assets/items/ListItem.md` (peta `ITEM_TIERS` di `src/lib/tiers.js`); item di
luar daftar itu jatuh ke penentuan lewat rentang harga. Stok hidup di memori,
jadi bot restart = undian baru.

Tampilan `/shop`: tiap item punya ikon emoji sendiri, badge warna rarity,
harga dengan penanda centang/silang apakah saldomu cukup, efek item, deskripsi
singkat, dan perintah `/buy <id>` siap salin. Header menampilkan saldo,
hitung mundur refresh (timestamp relatif Discord), dan filter yang aktif.
Selain opsi `tier:`/`cari:`, ada select menu tier langsung di pesan; warna
embed ikut warna tier saat filter tier aktif. Item diurutkan dari rarity
tertinggi lalu harga termahal.

**Item & efek.** Sebagian item punya efek dan bisa dipakai lewat `/use <id>`:
sekali pakai mengurangi stok di inventori lalu memberi XP atau poin. Daftar
efeknya ada di `src/database/shopCatalog.js` — item tanpa efek hanya koleksi.
Sengaja tidak ada efek "dapat coin" yang nilainya di atas harga item, supaya
beli-pakai-beli tidak jadi mesin cetak uang. XP dari item tidak langsung
memunculkan level baru; level ter-reconcile saat pesan chat berikutnya,
mengikuti pola event `messageCreate`.

**Quest.** Tiap user dapat 2 quest harian + 1 mingguan + 1 bulanan yang
diundi dari katalog (`src/lib/quests.js`) saat pertama kali disentuh di
periode itu. Periode harian memakai tanggal UTC, mingguan nomor pekan ISO,
bulanan `YYYY-MM`. Progres terisi otomatis dari aktivitas: pesan chat yang
lolos anti-spam, detik voice saat sesi berakhir, klaim `/daily` (quest streak
mencatat nilai terbesar yang pernah tercapai, bukan penjumlahan), total
belanja `/buy`, pakai item lewat `/use` (ada varian per rarity), `/give`, dan
naik level. Reward coin diklaim manual lewat tombol di `/quest`; tombolnya
stateless (pemilik + periode + quest ada di `customId`), jadi tetap berfungsi
setelah bot restart. Tipe "ikut/menang event" sengaja belum ada — menunggu
sistem event/boss.

**Command admin.** `/admin` (give-coin, reset-user, set-level) terkunci lewat
`setDefaultMemberPermissions(Administrator)`, jadi tidak muncul untuk member
biasa. Pemilik server tetap bisa membukanya untuk role moderator tertentu
lewat pengaturan integrasi bot. `reset-user` butuh opsi `konfirmasi: true`
secara eksplisit; dia menghapus baris user di keempat tabel (users, points,
user_items, quests), bukan sekadar men-nol-kan. Semua aksi admin tercatat di
log konsol dengan awalan `[Admin]`.

**Leaderboard mingguan.** `/leaderboard mingguan` menampilkan poin yang
didapat user di pekan berjalan (kunci pekan ISO yang sama dengan quest
mingguan, reset tiap Senin). Snapshot-nya terisi otomatis di `addPoints()` —
satu pintu untuk semua sumber poin (chat, voice, exchange) — ke tabel
`weekly_points`. Baris pekan lama dipertahankan sebagai riwayat; tidak ada
pekerjaan reset berkala.

**Mini boss.** Satu boss diundi tiap pukul 00:00 dan 12:00 waktu lokal event
(`BOSS.SPAWN_HOURS`, offset `BOSS_UTC_OFFSET`, default WIB) di channel
`BOSS_CHANNEL_ID`: Pump Freakin 45% (24.000 HP), Clown Orca 45% (30.000 HP),
Ancient Mummy 10% (60.000 HP, spesial). Player tidak punya HP — yang berdarah
hanya boss. Satu klik tombol memberi damage acak sesuai rentang boss
(300–900 sebelum buff `boss_damage`), dengan cooldown 10 detik per orang; boss
kabur setelah 6 jam. Hadiah dibagi ke top 3 damager (40%/25%/15%) dan pemberi
last hit (20%) — satu orang boleh kena dua jatah. Angka HP, damage, hadiah, dan
loot table ada di `src/lib/bossCatalog.js`; sisanya di `BOSS`
(`src/config/constants.js`).

**Boss menyerang balik.** Boss tidak bisa membunuh player (player tetap tanpa
HP); yang dilakukannya adalah memasang debuff atau merampas coin dompet.
Katalog serangan + aturan penggabungannya ada di `src/lib/bossAttacks.js`
(modul murni), penyimpanannya di `src/database/debuffs.js`. Debuff numpang di
tabel `user_buffs` tapi selalu memakai key ber-prefix `debuff:` supaya query
buff item lama tidak pernah tercampur. Pemicunya dua: serangan balik saat player
klik **Serang!** (`counterChance` per boss: 25% / 30% / 40%) dan amukan berkala
tiap `BOSS.RAMPAGE_INTERVAL_MS` ke maksimal `BOSS.RAMPAGE_TARGETS` penyerang
teraktif (kolom `boss_spawns.lastRampageAt` menjaga jadwalnya tidak dobel).
Urutan hitung selalu **buff item dulu, debuff belakangan** — `applyBuff()`
sudah melakukannya otomatis lewat `getDebuffMultiplier()`, jadi ability item
tidak pernah dibatalkan. Debuff tidak kena bonus durasi Endless Pulse dan tidak
ikut Rekindle; `cooldown_reset` (Chrono Core) membersihkannya. Catatan: pembagian ini sedang ditinjau ulang,
lihat [Balancing.md](Balancing.md).

## Panduan Dalam Bot (`/guide`)

Isi halaman didefinisikan di `src/ui/guidePages.js` (objek `PAGES`), bukan di
file command, supaya select menu dan tombol di
`src/events/interactionCreate.js` bisa memakainya ulang. Menambah halaman =
menambah satu entri `PAGES`; select menu dan tombol Beranda ikut menyesuaikan
otomatis. Angka yang ditulis di halaman harus dijaga sinkron dengan
`src/config/constants.js`, `src/lib/ranks.js`, `src/lib/tiers.js`, dan
`src/lib/quests.js`.

## Arsitektur

```
Discord  ──►  events/          ──►  database/     (baca-tulis SQLite)
              commands/        ──►  lib/          (rank, rotasi shop, emoji)
                               ──►  ui/           (embed, pagination, /guide)
                               ──►  cards/        (render PNG)
```

**`src/index.js`** memuat isi `commands/` dan `events/` otomatis berdasarkan
struktur folder. Menambah command = menambah file, tidak ada daftar manual yang
perlu diperbarui.

**`src/database/`** dipecah per domain: `users.js` (saldo, daily, transfer),
`points.js` (poin, XP, leaderboard), `shop.js` (katalog, pembelian, inventori).
`index.js` menyatukan semuanya, jadi pemakai cukup
`require('../../database')`. Skema dibuat lewat `CREATE TABLE IF NOT EXISTS`
dan kolom baru ditambal `ensureColumn()` saat start — database lama tidak perlu
dihapus saat update.

**`src/ui/`** memegang semua tampilan Discord. `embeds.js` menyediakan warna per
kategori dan helper `themedEmbed()`, `pager.js` menyediakan tombol navigasi.
State halaman disimpan di `customId` tombol (`aksi:kategori:halaman`), bukan di
memori, jadi tombol pada pesan lama tetap berfungsi setelah bot restart.

**`src/cards/`** merender gambar dengan `@napi-rs/canvas`. Avatar diunduh
dengan retry lalu di-cache ke `data/avatar-cache/`; kalau gagal, dibuat avatar
huruf awal supaya kartu tetap terkirim. Avatar GIF selalu dipaksa jadi PNG
karena canvas tidak bisa membacanya.

**`src/lib/tiers.js`** memegang rarity, bobot undian, dan warna tier tanpa
menyentuh database — dipakai `shopRotation.js`, `/shop`, dan `/inventory`, dan
dites langsung di `test/tiers.test.js`.

**`src/lib/leveling.js` & `src/lib/daily.js`** memuat perhitungan level-up dan
streak daily sebagai fungsi murni; command dan event hanya memanggilnya.

**`src/lib/emojis.js`** memusatkan semua custom emoji. Jangan tulis emoji
unicode langsung di command — detailnya di [Emoji.md](Emoji.md).

## Hal yang Gampang Bikin Bingung

- **Command tidak muncul di Discord.** Definisi command hanya sampai ke Discord
  lewat `npm run deploy`. Command global butuh waktu sampai sejenak untuk
  tersebar; pakai `GUILD_ID` saat development.
- **Poin tidak bertambah.** Cek Message Content Intent aktif, dan cek apakah
  `POINT_CHANNEL_ID` mengunci ke channel lain.
- **Muncul teks mentah `<:coin:123>`.** ID emoji salah atau emoji sudah dihapus
  dari aplikasi.
- **Item di `/shop` hilang sebelum dibeli.** Wajar, stok diundi ulang tiap 10
  menit dan `/buy` memvalidasi ke stok yang sedang aktif.

## Fitur AI (`/ai-ask`)

`/ai-ask input:<pertanyaan>` menjawab pertanyaan member soal bot. Jawabannya
tidak diambil dari database, tapi dari file pengetahuan `Docs/ai.md` — jadi
selama dokumen itu benar, jawabannya konsisten dengan aturan bot yang asli.

Alur singkatnya: command mem-`defer` balasan lalu menampilkan embed "sedang
mikir" (emoji `ai_think`) → `src/lib/aiContext.js` membaca `Docs/ai.md` (di-cache
5 menit) → `src/lib/ai.js` menyusun system prompt dari persona + aturan + isi
dokumen, lalu memanggil provider AI → embed tadi diganti jawaban final berisi
pertanyaan, jawaban, dan footer provider + model.

**Provider & fallback.** Semua provider memakai format API OpenAI-compatible,
dipakai berurutan sesuai `PROVIDERS` di `src/config/ai.js`:

| Urutan | Provider | Kunci di `.env` | Model default |
|---|---|---|---|
| 1 | Groq (utama) | `GROQ_API_KEY` | `GROQ_MODEL` → `llama-3.3-70b-versatile` |
| 2 | Google AI Studio | `GOOGLE_AI_API_KEY` | `GOOGLE_AI_MODEL` → `gemini-2.0-flash` |
| 3 | Google AI Studio (kunci kedua) | `GOOGLE_AI_API_KEY_2` | `GOOGLE_AI_MODEL` |

Kalau Groq kena limit/kuota/error server/timeout, permintaan yang sama langsung
diulang ke Google AI Studio kunci pertama; kalau itu juga limit, lanjut ke kunci
kedua. Status yang memicu fallback diatur di `FALLBACK_STATUS` (default
402/429/5xx). Error konfigurasi (401/403 kunci salah, 404 model tidak dikenali)
tidak di-fallback — langsung dilaporkan supaya kelihatan ada yang perlu dibetulkan.
Provider yang kuncinya kosong di `.env` otomatis dilewati, jadi boleh pakai satu
provider saja.

**Pengaturan** ada di `src/config/ai.js`:

| Kunci | Fungsi |
|---|---|
| `ENABLED` | Matikan fitur tanpa menghapus command |
| `PROVIDERS` | Daftar provider berurutan: label, env kunci, base URL, model |
| `FALLBACK_STATUS` | Status HTTP yang memicu pindah ke provider berikutnya |
| `PERSONA.NAME` / `CHARACTER` / `LANGUAGE` / `TONE` | Kepribadian & gaya bahasa jawaban |
| `PERSONA.RULES` | Aturan wajib yang selalu ditempel ke system prompt |
| `TEMPERATURE` / `MAX_TOKENS` / `MAX_ANSWER_CHARS` | Kreativitas & panjang jawaban |
| `COOLDOWN_MS` / `MAX_QUESTION_CHARS` / `REQUEST_TIMEOUT_MS` | Batas pemakaian per user (timeout per provider) |
| `CONTEXT_FILES` / `MAX_CONTEXT_CHARS` / `CONTEXT_CACHE_MS` | File pengetahuan dan cache-nya |
| `EPHEMERAL` | Jawaban privat (hanya penanya) atau terlihat semua orang |
| `SHOW_PROVIDER` | Tampilkan nama provider + model di footer embed |

Kunci API **tidak** ditaruh di config; isi `GROQ_API_KEY`, `GOOGLE_AI_API_KEY`,
dan `GOOGLE_AI_API_KEY_2` di `.env`. Kalau semua kunci kosong, `/ai-ask` membalas
pesan error yang jelas — bot lainnya tetap jalan normal.

**Emoji AI** (di `src/lib/emojis.js`): `ai_think` (`Aithink`) saat pertanyaan
masuk / bot mikir, `ai_answer` (`Aiask1`) di judul dan blok jawaban, dan
`ai_answer2` (`aiask2`) di baris penutup. Semuanya animated dan punya fallback
unicode kalau ID-nya dihapus.

Semua kegagalan provider (401/402/429/5xx/timeout) diterjemahkan jadi pesan
Bahasa Indonesia di embed error, dan tidak pernah dilempar sebagai exception.

Karena ada command baru, jalankan `npm run deploy` sekali setelah update ini.
