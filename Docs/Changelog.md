# Changelog

## Balancing Ekonomi (Coin, XP & Poin)

Semua angka diambil dari rekomendasi [Balancing.md](Balancing.md). 12 file berubah, 76/76 test pass.

**Voice**
- `VOICE.POINTS_PER_INTERVAL` **5 → 8** poin per 15 menit.
- Tambah `VOICE.XP_PER_INTERVAL: 10` — voice sekarang juga memberi XP, jadi
  member voice-only tetap bisa naik level. XP dibayarkan bersama poin di
  `voiceStateUpdate.js` (interval, endSession, syncEligibility).

**Daily**
- Tambah `DAILY.STREAK_MAX_BONUS: 3000` — bonus streak dibatasi setara 30 hari
  (100 × 30). Streak bisa terus naik, tapi coin per hari tidak naik selamanya.
- `computeDailyClaim()` di `src/lib/daily.js` memakai `Math.min()` untuk bonus
  dan `nextReward`.

**Exchange**
- `EXCHANGE_RATE` **500 → 1000** coin per poin. Kurs naik supaya leaderboard
  tetap soal aktivitas, bukan soal beli poin.

**Boss — Hadiah**
- Coin pool diturunkan: Pump Freakin **24.000 → 8.000**, Clown Orca
  **30.000 → 10.000**, Ancient Mummy **75.000 → 25.000** (`bossCatalog.js`).
- `computeRewards()` di `src/lib/boss.js` dirombak: 60% pool dibagi
  **proporsional damage ke semua peserta**, sisanya bonus top 3 (15%/10%/5%)
  + last hit (10%). Semua yang ikut menyerang dapat bagian.

**Boss — Peserta Minimum**
- Tambah `BOSS.MIN_PARTICIPANTS: 3`. Kalau boss tumbang tapi peserta kurang
  dari 3, hadiah tidak dibagikan dan boss dianggap kabur.
- `finishBoss()` di `src/lib/bossManager.js` mengecek jumlah peserta sebelum
  distribusi.

**Boss — Jam Spawn**
- `BOSS.SPAWN_HOURS` **[0, 12] → [12, 20]** WIB. Slot tengah malam yang
  sepi digeser ke jam 20:00.

**Level Up — Coin Cap**
- Coin naik level dibatasi: `Math.min(level × 50, 2500)` (`ranks.js`).
  Sebelumnya tanpa batas (level 100 = 5.000 coin).

**Level Up — Item Acak**
- Item random saat naik level sekarang memakai `weightedRandom()` dari
  `src/lib/tiers.js` berdasarkan rarity, bukan uniform dari seluruh katalog.
  Mythic tidak lagi punya peluang sama dengan Slime Gel.

**/give — Biaya Transfer**
- Tambah `GIVE_FEE_RATE: 0.05` (5%). Biaya dipotong dari saldo pengirim
  bersama jumlah transfer. Embed menampilkan rincian jumlah + biaya.

**Quest — Buff Dikunci**
- Tambah kolom `lockedMultiplier` di tabel `quests` (migrasi otomatis).
- Multiplier coin dikunci saat quest **selesai** (progress mencapai target),
  bukan saat diklaim. Mencegah pemain menunda klaim sambil pasang buff.
- `addQuestProgress()` menyimpan multiplier; `claimQuest()` memakai yang
  lebih besar antara locked dan current.

**Dokumentasi & Test**
- `test/boss.test.js`: 3 tes disesuaikan — proporsional reward, share 0.85
  untuk top1+lasthit, spawn slot 12/20.

**Samakan Zona Waktu Periode**
- Tambah `localDateKey(date, offset)` di `src/lib/boss.js` — mengembalikan
  YYYY-MM-DD dalam zona waktu lokal server (`BOSS.UTC_OFFSET`, default WIB).
- `src/lib/daily.js`: `dateKey()` sekarang memakai `localDateKey()` alih-alih
  `toISOString()` mentah. Hari baru berganti tengah malam WIB, bukan 07:00 WIB.
- `src/lib/quests.js`: `dailyKey()`, `weeklyKey()`, dan `monthlyKey()` ikut
  memakai `localDateKey()`. Quest harian/mingguan/bulanan sekarang selaras
  dengan `/daily` dan boss.
- `test/daily.test.js`: waktu test disesuaikan supaya cocok dengan zona lokal.

## Cooldown Serang 10 Detik & Boss Bisa Menyerang Player

**Cooldown**
- `BOSS.ATTACK_COOLDOWN_MS` **90 detik → 10 detik** (`src/config/constants.js`).
  Embed boss ikut menampilkan angka baru karena memang membacanya dari konstanta.
- `attackCooldownLeft(lastAttackAt, now, cooldownMult)` di `src/lib/boss.js`
  sekarang menerima pengali cooldown. Nilai < 1 diabaikan (`Math.max(1, ...)`)
  supaya debuff tidak bisa dipakai untuk mempercepat serangan.

**Boss menyerang balik (fitur baru)**
- Modul murni baru `src/lib/bossAttacks.js`: katalog 10 serangan boss
  (Rantai Berat, Belenggu Kutukan, Aura Melemahkan, Kutukan Serakah, Debu
  Kabur, Kutukan Bisu, Pukulan Linglung, Rampas Koin, Perampokan Makam, Tanda
  Kutukan), metadata key debuff, `pickDebuff`, `pickBossAttack`, `rollCounter`,
  `stealAmount`, dan `describeDebuff`.
- Lapisan baru `src/database/debuffs.js`: `addDebuff`, `getDebuff`,
  `getActiveDebuffs`, `consumeDebuffCharge`, `clearDebuffs`, `applyBossAttack`.
  Diekspor lewat `src/database/index.js`.
- `src/lib/bossCatalog.js`: tiap boss dapat field `counterChance` (25% / 30% /
  40%) dan `attacks` (daftar id serangan yang bisa diundi).
- `src/lib/bossManager.js`: serangan balik dijalankan saat player klik
  **Serang!**, plus fungsi baru `rampageBoss()` — tiap 5 menit boss menyerang
  maksimal 3 penyerang teraktif (window 15 menit) dan mengumumkannya di channel
  boss. Penjaga jadwal boss yang lama sekalian memicunya.
- `src/lib/boss.js`: helper baru `pickRampageTargets()`.
- `src/ui/bossEmbeds.js`: `bossRampageEmbed()`, `counterLines()`, embed hasil
  serangan menampilkan debuff yang baru menempel / coin yang dirampas / serangan
  yang meleset, dan embed boss memperingatkan bahwa boss bisa membalas.
- `src/commands/economy/buffs.js`: `/buffs` kini punya bagian **Debuff dari
  Mini Boss** terpisah dari daftar buff item.
- `src/database/schema.js`: kolom baru `boss_spawns.lastRampageAt` (lewat
  `ensureColumn`, aman untuk database lama).

**Aturan biar tidak bentrok dengan ability item**
- Debuff disimpan di tabel `user_buffs` tapi selalu memakai key ber-prefix
  `debuff:`, jadi tidak pernah tercampur dengan key buff item.
  `getActiveBuffs()` sekarang menyaring baris debuff.
- Buff item dihitung **lebih dulu** dan tidak pernah dibatalkan; debuff hanya
  mengalikan hasil akhirnya. `applyBuff()` melakukannya otomatis lewat
  `getDebuffMultiplier()`; `distributeRewards()` memakai aturan yang sama untuk
  coin dan peluang loot.
- Debuff sejenis tidak menumpuk (dipakai yang terparah), tidak kena bonus durasi
  Endless Pulse, dan tidak ikut diperpanjang Rekindle.
- Chrono Core (`cooldown_reset`) sekarang sekaligus membersihkan semua debuff.
- Coin hanya dirampas dari dompet, tidak dari bank.

**Dokumentasi & tes**
- [ai.md](ai.md): bagian **6b** dapat sub-bab "Boss Menyerang Balik" (tabel
  serangan + aturan debuff) dan 4 FAQ baru; angka cooldown diperbarui.
  [Bot.md](Bot.md), [Balancing.md](Balancing.md), dan [ability.md](ability.md)
  ikut disesuaikan.
- `test/bossAttacks.test.js` baru (10 tes): cooldown 10 detik, pengali cooldown,
  validitas katalog serangan tiap boss, debuff tidak menumpuk, debuff
  kadaluarsa, key debuff tidak bentrok dengan key buff, batas rampasan coin,
  sasaran amukan, dan format deskripsi. `npm test` hijau (76/76).

## Ikon Gambar Mini Boss

- Tiga ikon boss baru di `assets/boss/`: `pump_freakin.png`, `clown_orca.png`,
  dan `ancient_mummy.jpeg`. Nama filenya didaftarkan di field baru `icon` pada
  `src/lib/bossCatalog.js`.
- Modul baru `src/lib/bossIcons.js` (`bossIcon`, `bossIconFiles`,
  `bossIconPath`) membungkus file ikon jadi `AttachmentBuilder` + URL
  `attachment://boss-<key>.<ext>`. Kalau filenya tidak ada, hasilnya `null`/`[]`
  sehingga embed boss tetap terkirim tanpa gambar.
- `src/ui/bossEmbeds.js`: embed boss hidup, hasil serangan, boss tumbang, dan
  boss kabur sekarang memakai ikon boss sebagai **thumbnail**.
- `src/lib/bossManager.js`: lampiran ikon dikirim di spawn, tiap `update` tombol
  serang, hasil serangan ephemeral, embed hasil akhir, embed kabur, dan saat
  embed boss dipulihkan setelah restart (attachment memang harus dikirim ulang
  di setiap edit, kalau tidak thumbnail-nya hilang).
- Dokumentasi: [ai.md](ai.md) dapat bagian **6b. Mini Boss** (jadwal, cara ikut,
  pembagian hadiah, daftar boss + ikon) dan FAQ soal izin **Attach Files**;
  status "[belum ada]" untuk mini boss & quest event dihapus.
  [Emoji.md](Emoji.md) dapat bagian **Ikon Gambar Boss**.
- `npm test` hijau (66/66).

## Perbaikan Bug #1 & #2

- `test/quests.test.js`: tipe quest `boss_join` dan `boss_kill` ditambahkan ke
  daftar `TYPES`, jadi katalog quest boss lolos validasi. `npm test` hijau
  kembali (66/66).
- `src/database/abilities.js`: `daily_reset` dan `cooldown_reset` tidak lagi
  mengeset `lastDaily = NULL` (yang membuang streak). Helper baru
  `rewindDaily()` mengisi `lastDaily` dengan tanggal kemarin, sehingga `/daily`
  bisa diklaim lagi dan streak tetap berjalan.
- [Bugs.md](Bugs.md): temuan #1 dan #2 ditandai selesai.

## Audit Dokumentasi & Balancing

- Dokumen baru [Balancing.md](Balancing.md): peta tiga mata uang, tabel
  pemasukan harian per sumber, perbandingan harga item versus manfaatnya, dan
  usulan angka baru untuk boss, voice, streak daily, serta sink coin.
- Dokumen baru [Bugs.md](Bugs.md): sepuluh temuan dari pembacaan kode dan
  `npm test`, lengkap dengan lokasi file dan saran perbaikannya.
- [ToDoV2.md](ToDoV2.md): mini boss ditandai selesai, ditambah gelombang tiga
  berisi delapan pekerjaan balancing (coin, XP, poin) yang diurutkan
  berdasarkan dampaknya.
- [Bot.md](Bot.md) bagian "Aturan Angka" akhirnya punya bagian **Mini boss**
  (jam spawn, HP, damage, cooldown, pembagian hadiah).
- [Analisis.md](Analisis.md): dua bagian baru — "Ekonomi & Balancing" dan
  "Bug yang Sedang Terbuka".

## Sistem Mini Boss

- Tiga boss baru: **Pump Freakin** (45%), **Clown Orca** (45%), dan
  **Ancient Mummy** (10%, boss spesial). Satu boss diundi tiap **00:00** dan
  **12:00** waktu lokal event (`BOSS_UTC_OFFSET`, default WIB) lalu dikirim ke
  channel mini boss (`BOSS_CHANNEL_ID`).
- Player tidak punya HP — hanya boss. Serangan lewat tombol **Serang!** dengan
  cooldown 90 detik per orang; boss kabur kalau belum tumbang dalam 6 jam.
- Hadiah dibagi ke **top 3 damager** (40% / 25% / 15%) dan **pemberi last hit**
  (20%). Satu orang bisa kena dua jatah dan jatahnya dijumlahkan. Isi hadiah:
  item acak dari loot table, coin, XP, dan poin.
- Ability boss dari item (Sharpened Edge, Void Grip, Heavy Impact, Kingslayer,
  Star Cleave) sekarang benar-benar dibaca: `boss_damage` menaikkan damage,
  `boss_loot_rate` peluang drop, `boss_drop_amount` jumlah item, dan
  `quest_coin`/Deep Current tetap kena ke coin hadiah boss.
- Tabel baru `boss_spawns` dan `boss_damage`; boss aktif dipulihkan otomatis
  saat bot restart supaya tombolnya tetap jalan.
- Command admin baru `/admin-spawn-boss` untuk tes (perlu `npm run deploy`),
  halaman **Mini Boss** di `/guide`, plus quest baru `boss_join` (harian) dan
  `boss_kill` (mingguan).
- Emoji `boss`, `boss_hp`, `boss_loot` akhirnya terpakai; ditambah `boss_hit`
  untuk tombol serang.


## Emoji Baru: Pager, Guide, Quest, Ability & Boss

- Pager (`/shop`, `/inventory`, `/leaderboard`) kini memakai emoji khusus:
  `back` di tombol **Sebelumnya** dan `next` di tombol **Berikutnya**
  (sebelumnya hanya `arrow` di satu sisi).
- Tombol tutup `/guide` memakai `cancel` (animated), bukan lagi ikon `error`.
- Quest punya ikon sendiri: `/quest` dan halaman Quest di `/guide` memakai
  `quest`, menggantikan pemakaian ulang ikon `daily`/`guide`.
- Ability & buff: efek bertipe `ability` memakai ikon universal `ability`
  (dulu `level`), judul embed `/buffs` memakai `buff`, dan tiap baris buff
  yang sedang berjalan diawali `buff_active` (animated).
- Tiga emoji boss (`boss`, `boss_hp`, `boss_loot`) didaftarkan di registry
  tapi belum dipasang di command mana pun — menunggu sistem mini boss.

## Ability & Buff Item

- Semua 30 item bawaan kini punya efek. Common–Rare memberi multiplier Coin/XP/
  Poin berdurasi; Epic–Mythic punya ability bernama (Insight, Sturdy, Genesis,
  Time Skip, dan seterusnya). Ringkasannya di [ability.md](ability.md).
- Format kolom `effect` diperluas jadi `mult` dan `ability`; efek instan lama
  (`xp`, `points`) tetap dikenal. Kolom `effect` sekarang selalu disamakan
  dengan katalog tiap boot lewat `syncEffects()` (dulu `backfillEffects()` yang
  hanya mengisi baris kosong).
- Tabel baru `user_buffs` (satu baris per pemakaian, `expiresAt`/`charges`)
  plus `src/lib/buffs.js` (logika murni) dan `src/database/buffs.js`
  (penyimpanan). Buff dengan efek sama tidak menumpuk — yang dipakai pengali
  terbesar. Baris kadaluarsa disapu tiap 10 menit sejak `ready`.
- Multiplier terpasang di `/daily`, hadiah quest, hadiah naik level, poin & XP
  chat, dan poin voice. `/give` dan `/exchange` sengaja tidak kena supaya item
  tidak jadi mesin cetak uang.
- Ability non-boss jalan penuh: Insight (progres quest ×2), Second Wind (reset
  cooldown `/daily`), Rekindle (perpanjang semua buff), Sturdy (3 `/use` tidak
  menghabiskan item), Deep Current (coin quest & boss ×2), Blessing (XP penuh),
  Genesis, Astral Rift (buff se-server), Endless Pulse (durasi buff +25%), dan
  Time Skip (reset cooldown).
- Ability boss (Sharpened Edge, Void Grip, Heavy Impact, Kingslayer, Star
  Cleave) sudah memasang buff-nya, tinggal dibaca sistem mini boss. Rencana
  pembacaannya di [bossplan.md](bossplan.md).
- Command baru `/buffs`: daftar buff aktif beserta sisa waktu atau sisa jatah.
  Tampilan `/shop` dan `/inventory` tidak diubah — deskripsi item lengkap
  menunggu fitur bestiary.
- Test bertambah 8 (`test/buffs.test.js`): stacking, kadaluarsa, pembulatan,
  bonus durasi, format sisa waktu, dan validitas efek seluruh katalog.
- Tier Secret dari rencana awal tidak dibuat; item tetap Common–Mythic.

## Logger Berlevel Menggantikan console.log

- Semua `console.log`/`console.error` di `src/` dan `scripts/` diganti
  `src/lib/logger.js` — tanpa dependency baru. Tiap baris berisi timestamp
  lokal (`YYYY-MM-DD HH:mm:ss`) dan tag level selebar lima karakter:
  `[INFO ]`, `[WARN ]`, `[ERROR]`, `[DEBUG]`.
- Empat level dengan filter `LOG_LEVEL` di `.env` (default `info`; isi
  `debug` untuk melihat semuanya). `warn` dan `error` tetap ke stderr.
- Awalan bracket manual jadi scope: `logger.scope('Admin')`,
  `scope('Shop')`, `scope('Voice')`.
- Objek `Error` yang dikirim sebagai argumen tidak di-string-kan, jadi stack
  trace tetap utuh di log.
- Item terakhir di daftar Teknis [ToDo.md](ToDo.md) selesai; ditambah 9 test
  (`test/logger.test.js`) untuk format timestamp, urutan level, scope, dan
  penyaringan `LOG_LEVEL`.

## Isi /guide Dirombak + ToDo v2

- `/guide` sekarang punya **11 halaman** (dari 7) dan isinya disamakan dengan
  perilaku kode yang sebenarnya: halaman baru **Quest**, **Item & Rarity**,
  **Utilitas**, dan **Admin**.
- Angka-angka nyata masuk ke panduan: 7 kata = 2 poin, 1 XP/kata dengan batas
  20 XP per pesan, cooldown anti-spam 3 detik, jendela duplikat 30 detik,
  voice 15 menit = 5 poin dengan syarat minimal 2 pendengar dan bukan AFK
  channel, daily 500 + 100 x streak, kurs 500 coin = 1 poin, dan rumus level
  (level x 100 XP).
- Halaman **Ekonomi** melengkapi opsi `/shop tier:` dan `/shop cari:`, serta
  `/bank deposit|withdraw`.
- Halaman **Poin & Level** memuat seluruh subcommand leaderboard, termasuk
  `rank` dan `mingguan` yang sebelumnya tidak disebut sama sekali.
- Halaman **Reward** menyebut peluang item random naik level (10% + 1% per
  level, maksimal 50%) dan XP berlebih yang bisa melompati beberapa level.
- Halaman **Quest** menjelaskan undian 2 harian + 1 mingguan, hadiah tiap
  misi, dan bahwa progres tercatat otomatis.
- Halaman **Item & Rarity** menjelaskan bobot undian tier
  (Common 30 sampai Mythic 5) dan beda item berefek vs item koleksi.
- Halaman **Admin** mendokumentasikan tiga subcommand `/admin` beserta
  syarat izin Administrator.
- Dokumentasi: `Docs/ToDoV2.md` baru berisi rencana asset rank baru, tambahan
  quest, mini boss tiap jam 00:00 & 12:00, dan ability/stat per item.
  `Docs/ToDo.md` lama tidak diubah isinya, hanya diberi penunjuk ke v2.

## Katalog Quest Diperluas + Quest Bulanan

- Tipe quest baru: `spend` (total belanja di `/buy`), `level_up` (naik level),
  `daily_streak` (angka streak saat `/daily` diklaim; progres memakai nilai
  terbesar yang pernah dicapai, bukan penjumlahan), dan `use_tier` (pakai item
  dengan rarity tertentu, dicocokkan lewat parameter `meta` baru di
  `addQuestProgress()`).
- Scope **bulanan**: kunci periode `monthly:YYYY-MM` UTC tanpa pekerjaan reset;
  tiap user dapat 1 quest bulanan dari pool baru (ngobrol 500 pesan, voice
  12 jam, belanja 60 ribu coin, naik 8 level, streak 14 hari). `/quest`
  menampilkan seksi Bulanan dan tombol klaim kini bisa lebih dari satu baris
  (maksimal 5 tombol per baris).
- Pool undian jadi 7 harian / 7 mingguan / 5 bulanan (sebelumnya 5/3), hadiah
  mengikuti kesulitan — contoh: item Epic 2.200 coin vs Legendary 4.000.
- `buyItem()` dan `useItem()` kini ikut mengembalikan `price` (dan `name`)
  supaya command cukup melapor ke sistem quest tanpa query ulang.
- Tipe "ikut/menang event" sengaja belum dibuat — menunggu sistem event/boss.

## Asset Rank Baru di Kartu

- Logo tier di `assets/ranks/` diganti total: set lama strip landscape
  (677x369) diganti set kotak yang sama dengan sumber emoji `tier_*`
  (Novice–Demigod, dari `assets/emoji/`). Peta `logo` di `src/lib/ranks.js`
  mengikuti nama file baru.
- Blok gambar logo yang tadinya disalin di kartu `rank` dan `profile`
  dipindah ke helper `drawRankLogo()` (`src/cards/canvasKit.js`) — satu tempat
  untuk ukuran & posisi. Logo kini dipatok sisi terpanjang 26px dan
  disejajarkan dengan garis teks info rank, bukan kotak 42px yang dulu
  di-tuning untuk gambar landscape.
- Background `assets/rank/Rank.jpeg`, warna tier, dan emoji `tier_*` tidak
  berubah.

## UI Shop Ringkas + /credit & /botinfo

- `/shop` dirampingkan: daftar item pindah dari field ke satu blok deskripsi,
  satu item = dua baris (nama + ID, lalu harga · rarity · efek). Lore/deskripsi
  item dihapus, emoji rarity dihapus (teks rarity tetap ada, juga di select
  menu filter), dan penanda `error` untuk item yang tak terbeli dihilangkan —
  hanya item yang mampu dibeli yang dapat centang.
- Command baru `/credit`: daftar kontributor beserta perannya (backend,
  frontend, dll). User ID diisi manual di array `CREDITS` pada file command.
- Command baru `/botinfo`: versi bot, Node.js, discord.js, SQLite3
  (better-sqlite3) + ukuran database, uptime, latency, memori, jumlah server,
  member, dan command.
- Emoji baru di registry: `backend`, `frontend`, `person`, `developer`,
  `nodejs`, `discordjs`, `database`.

## Ikon Item & Rombak UI Shop

- Tiap item shop punya emoji sendiri (`src/lib/itemEmojis.js`, ID dari
  `assets/items/emoji_itam.md`), dipakai di `/shop`, `/inventory`, `/buy`, dan
  `/use`. Nama tak dikenal jatuh ke `📦`, jadi item tambahan tidak bikin error.
- Rarity item bawaan sekarang mengikuti daftar resmi `assets/items/ListItem.md`
  lewat peta `ITEM_TIERS`, bukan ditebak dari rentang harga (harga tetap jadi
  fallback untuk item di luar katalog).
- `/shop`: header saldo, hitung mundur refresh dengan timestamp relatif,
  badge warna rarity + peluang drop, penanda mampu/tidak beli, deskripsi item,
  select menu filter tier di pesan, warna embed mengikuti tier yang difilter,
  dan urutan rarity tertinggi lebih dulu.
- `/inventory`: menampilkan ID item asli untuk `/use`, ikon, dan badge rarity.

## Test, Linter, dan Font Kartu Adaptif

- Logika murni dipisah ke `src/lib/leveling.js`, `src/lib/daily.js`, dan
  `src/lib/tiers.js`; `messageCreate`, `/daily`, dan rotasi shop tinggal
  memanggilnya. `src/database/shop.js` kini juga mengembalikan `price` dan `id`
  item inventori supaya UI bisa menghitung rarity.
- `npm test`: 25 test dengan runner bawaan Node (`node:test`), tanpa dependency
  tambahan.
- `npm run lint` / `npm run format`: ESLint 9 flat config + Prettier.
- `fitText()` di `src/cards/canvasKit.js` mengecilkan font bertahap untuk nama
  panjang sebelum memotong dengan elipsis — dipakai di kartu profile, rank, dan
  leaderboard.

## Sesi Voice Tahan Restart

Sesi voice yang sedang berjalan kini dicerminkan ke tabel `voice_sessions`
(write-through dari memori). Manfaatnya:

- Bot mati di tengah sesi tidak lagi menghanguskan waktu voice — saat boot,
  `restoreVoiceTracking()` melanjutkan sesi dengan `joinedAt` dan jam poin
  aslinya, jadi durasi dan sisa poin tetap dibayar.
- Kalau kelayakan berubah selama bot mati (teman keluar, pindah AFK), masa
  downtime tidak dibayar — jam poin dimajukan tanpa pembayaran hantu.
- Baris sesi untuk user yang sudah keluar voice selama bot mati dibuang
  otomatis saat restore.
- User yang keluar voice sebelum bot sempat restore tetap dibayar penuh:
  `endSession` jatuh ke baris tabel kalau sesinya tidak ada di memori.

## Leaderboard Mingguan

Subcommand baru `/leaderboard mingguan`: poin yang didapat user di pekan
berjalan, diurutkan dari terbesar.

- Snapshot per periode disimpan di tabel `weekly_points` dengan kunci pekan
  ISO yang sama dengan quest mingguan; ganti pekan = mulai dari nol tanpa
  pekerjaan reset berkala, dan baris lama tetap tersimpan sebagai riwayat.
- Pengisian terjadi otomatis di `addPoints()`, jadi semua sumber poin (chat,
  voice, exchange) terhitung tanpa hook tambahan.

## Command Admin

Command `/admin` baru dengan tiga subcommand, terkunci ke izin Administrator
Discord (bisa dibuka per-role oleh pemilik server lewat pengaturan
integrasi):

- `/admin give-coin <user> <jumlah>` — beri coin untuk event/hadiah.
- `/admin reset-user <user> <konfirmasi>` — hapus seluruh data user di guild
  (saldo/bank/streak, poin/level/XP, inventori, quest) dalam satu transaksi;
  wajib mengisi `konfirmasi: true`.
- `/admin set-level <user> <level>` — atur level manual; XP di-reset ke 0 di
  level baru.

Modul database `src/database/admin.js` menampung SQL reset; semua aksi admin
tercatat di log konsol dengan awalan `[Admin]`.

## Filter & Pencarian di /shop

`/shop` kini punya dua opsi opsional: `tier:` (pilihan Common–Mythic) dan
`cari:` (potongan nama, tidak peduli huruf besar-kecil).

- Keduanya bisa dipakai bersamaan; embed menampilkan baris "Filter aktif"
  beserta jumlah item yang cocok, atau pesan kosong yang jelas.
- Tombol halaman tetap bekerja dengan filter aktif: state filter ikut
  tersimpan di customId (`shop_page:<tier>:<kata kunci>:<halaman>`), jadi
  tetap stateless dan tahan restart. Tombol dari format lama tetap didukung.
- Kata kunci dibersihkan dari karakter `:` dan dipatok 40 karakter agar
  customId tidak meluap.

## Quest Harian & Mingguan

Command `/quest`: tiap user dapat 2 quest harian + 1 quest mingguan yang
diundi dari katalog (`src/lib/quests.js`), dengan reward coin yang diklaim
lewat tombol.

- Quest baru ditugaskan malas — dibuat saat pertama kali disentuh di periode
  itu, jadi user pasif tidak menyisakan data. Periode harian pakai tanggal
  UTC, mingguan pakai nomor pekan ISO.
- Progres otomatis dari aktivitas yang sudah ada: pesan chat (lolos
  anti-spam), detik voice saat sesi berakhir, klaim `/daily`, `/use`, `/buy`,
  dan `/give`. Progres dipatok di target.
- Tabel `quests` baru; target & reward disimpan per baris supaya perubahan
  katalog tidak mengubah quest yang sedang berjalan.
- Tombol klaim stateless (`quest_claim:pemilik:periode:quest`) dan hanya
  bisa ditekan pemiliknya.

## Bank Bisa Diisi

Command `/bank` dengan dua subcommand: `deposit` (dompet → bank) dan
`withdraw` (bank → dompet). Kolom `bank` di tabel users sebenarnya sudah ada
sejak awal, kini akhirnya terpakai. Validasi kecukupan saldo di command,
mutasi dua kolom di `src/database/users.js`.

## Backup Database

`npm run backup` (`scripts/backup-db.js`) menyalin `data/economy.db` ke
`data/backups/economy-<timestamp>.db`.

- Memakai `db.backup()` bawaan better-sqlite3, jadi aman dipanggil saat bot
  sedang berjalan — hasilnya konsisten walau ada transaksi berjalan.
- Retensi default 7 salinan terbaru, bisa diubah lewat variabel `BACKUP_KEEP`.
- Cocok dijadwalkan lewat cron / Task Scheduler.

## Poin Voice Butuh Teman

Duduk sendirian atau di AFK channel tidak lagi menghasilkan poin.

- Syarat layak: channel berisi minimal 2 manusia yang tidak deaf (termasuk
  yang bersangkutan) dan bukan AFK channel. Angkanya di
  `VOICE.MIN_LISTENERS` (`src/config/constants.js`).
- Kelayakan dievaluasi ulang di setiap perubahan voice state — join, keluar,
  pindah, deafen — karena satu peristiwa bisa mengubah nasib orang lain di
  channel yang sama.
- Saat kehilangan kelayakan, sisa masa layak dibayar seketika lalu jam poin
  direset; waktu tidak layak tidak pernah menumpuk jadi utang poin.
- Leaderboard jam voice tetap mencatat semua durasi, termasuk saat sendirian.

## Anti-Spam Poin Chat

Mengirim kata berulang-ulang tidak lagi menghasilkan poin.

- Pesan dalam jarak kurang dari 3 detik sejak pesan sebelumnya diabaikan
  (cooldown per user per server).
- Isi yang sama persis dengan pesan sebelumnya dalam 30 detik juga diabaikan;
  pesan spam tidak mendapat apa pun: tanpa poin, XP, maupun akumulasi
  `pendingWords`. Angka aturan ada di `CHAT.ANTISPAM_COOLDOWN_MS` dan
  `CHAT.DUPLICATE_WINDOW_MS` (`src/config/constants.js`).
- Logika diekstrak ke `src/lib/antispam.js` dengan jejak memori terbatas
  (maksimum 1000 user terlacak).

## Item Bisa Dipakai

Fitur `/use` — item dengan efek kini punya fungsi, tidak lagi sekadar numpuk di
`/inventory`.

- Kolom `effect` (JSON) baru di tabel `shop_items`, ditambal `ensureColumn()`
  dan di-backfill dari katalog untuk database lama.
- Sepuluh item jadi consumable (Slime Gel, Tattered Parchment, Glowing
  Mushroom, Beast Fang, Stardust Core, Tears of the Fallen, Holy Grail
  Fragment, Astral Fragment, Heart of the Primordial, Chrono Core) — efeknya
  XP atau poin. Sisanya tetap koleksi.
- Command baru `/use <id>`: memakai satu buah item; pengurangan stok dan
  pemberian efek dalam satu transaksi SQLite.
- `/shop` dan `/inventory` kini menampilkan teks efek item yang bisa dipakai.

## Perbaikan

- Loader command (`src/index.js` dan `scripts/deploy-commands.js`) crash dengan
  `ENOTDIR` kalau `src/commands/` berisi file biasa seperti penjaga git
  `.nekokeep`. Sekarang hanya folder yang dipindai.

## Restrukturisasi

Perombakan susunan proyek. Tidak ada perubahan perilaku bot bagi pengguna —
semua command, angka, dan isi database tetap sama.

**Struktur**

- Seluruh kode aplikasi pindah ke `src/`; skrip deploy pindah ke `scripts/`.
- `utils/` yang jadi tempat buangan dipecah sesuai perannya: `ui/` (embed,
  pagination, halaman guide), `cards/` (render gambar), `lib/` (logika murni:
  rank, rotasi shop, emoji, path).
- `database.js` yang tadinya satu file besar dipecah jadi `connection.js`,
  `schema.js`, `users.js`, `points.js`, `shop.js`, dan `shopCatalog.js`, dengan
  `index.js` sebagai pintu masuk — pemanggilnya tidak perlu ikut berubah.
- Semua path ke `assets/` dan `data/` lewat `src/lib/paths.js`, jadi tidak ada
  lagi rantai `../../..` yang gampang patah saat file dipindah.

**Kode**

- Angka balancing (rate poin chat & voice, reward daily, kurva level, kurs
  tukar) dikumpulkan di `src/config/constants.js`.
- Rumus level yang tadinya disalin di beberapa command sekarang satu helper
  `xpForLevel()`.
- Loader command dan event ditulis ulang jadi lebih ringkas dan tahan terhadap
  file yang bukan command.
- Komentar dirapikan: yang cuma mengulang isi kode dihapus, yang tersisa
  menjelaskan alasan — mode WAL, reset daily berbasis tanggal kalender, avatar
  GIF yang harus dipaksa PNG, dan batasan token interaksi Discord.

**Dokumentasi**

- Folder `Docs/` baru: `Bot.md`, `Emoji.md`, `ToDo.md`, `Contributor.md`,
  dan berkas ini.
- README dipersingkat jadi sekadar cara menjalankan dan peta folder.
- `.gitignore` diperbaiki supaya `data/` dan file `.env` tidak ikut ter-commit.
