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
| `/quest` | Quest harian & mingguan: progres dan tombol klaim reward |
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

**Quest.** Tiap user dapat 2 quest harian + 1 quest mingguan yang diundi dari
katalog (`src/lib/quests.js`) saat pertama kali disentuh di periode itu.
Periode harian memakai tanggal UTC, mingguan memakai nomor pekan ISO. Progres
terisi otomatis dari aktivitas: pesan chat yang lolos anti-spam, detik voice
saat sesi berakhir, klaim `/daily`, `/use`, `/buy`, dan `/give`. Reward coin
diklaim manual lewat tombol di `/quest`; tombolnya stateless (pemilik +
periode + quest ada di `customId`), jadi tetap berfungsi setelah bot restart.

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
