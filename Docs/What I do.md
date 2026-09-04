# What I do

Pengganti [Changelog.md](Changelog.md) — file lama itu sudah kepanjangan,
jadi mulai gelombang ini catatan perubahan lanjut di sini. Formatnya sama:
perubahan diceritakan per gelombang, angka merujuk ke kode, bukan dihafal.

## Gelombang Sepuluh — Limit Harian `/give` (Count & Nominal)

Bug dari `Docs/Bugs...md` #9: `/give` tanpa batas — tidak ada limit harian dan
tidak ada minimum umur akun, jadi coin bisa dijejalkan ke satu akun (santet
alt) tanpa batas dan langsung naik langsung di leaderboard. Keputusan owner:
pasang **limit harian**, dua-duanya (jumlah transfer & nominal), tanpa ribet
soal umur akun.

**Angka (bisa diubah di `src/config/constants.js`)**
- `GIVE.DAILY_LIMIT_COUNT = 5` — maksimal 5× `/give` sukses per hari per user.
- `GIVE.DAILY_LIMIT_COIN = 50000` — maksimal 50.000 coin keluar per hari per
  user (nominal transfer, tanpa fee). Fee 5% tetap dibakar seperti biasa.
- `GIVE_FEE_RATE` lama dipertahankan sebagai alias `GIVE.FEE_RATE` supaya
  pemanggil/test yang sudah ada tidak patah.

**Database (`src/database/schema.js`, `src/database/giveDaily.js` baru)**
- Tabel `give_daily`: `userId, guildId, dayKey, count, totalCoin` (PK
  user+guild+hari). `dayKey` = `YYYY-MM-DD` lokal event (`lib/boss
  localDateKey`), jadi **reset alami tiap ganti hari**, tanpa perlu jam
  midnight cleanup — konsisten dengan daily/quest/staff. Baris lama tetap
  disimpan sebagai riwayat pemakaian.
- `getGiveUsage(userId, guildId)` — baca pemakaian hari ini (buat baris kalau
  belum ada).
- `checkGiveLimit(userId, guildId, amount)` — satu keputusan untuk dua batas:
  tolak kalau `count >= DAILY_LIMIT_COUNT` (`reason: 'count'`) atau kalau
  `totalCoin + amount > DAILY_LIMIT_COIN` (`reason: 'coin'`). Balikan berisi
  sisa jatah biar command bisa tampilkan pesan yang informatif.
- `recordGive(userId, guildId, amount)` — tambah `count + 1` dan `totalCoin`
  (dipanggil tepat setelah transfer sukses, jadi tidak ada yang terhitung
  kalau transfer batal).

**Command (`src/commands/economy/give.js`)**
- Setelah cek saldo, sebelum transfer: `checkGiveLimit`. Kalau ditolak,
  tampilkan error yang menyebut batas mana yang kena plus sisa jatah hari ini
  (Jumlah transfer / nominal). `recordGive` dijalankan setelah
  `transferCoinsWithFee` sukses.

**Verifikasi**: `test/giveLimit.test.js` (baru, DB temp terisolasi, 5 kasus) —
bawah batas diizinkan, akumulasi count & nominal, tolak di batas count, tolak
saat amount melewati sisa nominal (walau belum kena batas count), dan reset di
hari berikutnya. `npm run lint` bersih, `npm test` **105/105** hijau.

## Gelombang Sembilan — `voiceMinutes` Staff Dibayar Per Interval

Bug dari `Docs/ToDoV3.md`: `voiceMinutes` untuk leaderboard staff cuma
tercatat di `endSession()` — staff yang duduk berjam-jam di voice tanpa
pernah leave tidak dapat kredit sampai dia keluar channel, jadi
`/best-staff-of-the-month` bisa terlihat nol padahal staff itu aktif di
voice sepanjang bulan. Disamakan dengan model Poruv/`voice_seconds` yang
membayar tiap interval.

**Keputusan**: menyamakan dengan interval periodik, bukan mengejar staf yang
harus "menyelesaikan" sesi. Staff yang masih betah di voice tetap kelihatan
progresnya di leaderboard bulan berjalan.

**Jalur baru `src/events/voiceStateUpdate.js`**
- `grantStaffVoiceMinutes(session, chunks)` (baru): mengakumulasi
  `voiceMinutes` (via `addVoiceMinutes` di `src/database/staff.js`) sebesar
  `chunks * VOICE.INTERVAL_MINUTES` untuk staff — tapi cuma kalau sesi sedang
  **layak** (bukan sendirian/deaf/AFK), konsisten dengan pembayaran poin/XP.
  Dipanggil dari **tiga** tempat pembayaran bisa terjadi:
  1. `setInterval` berkala — tiap interval layak yang dibayar, `chunks = 1`.
  2. `syncEligibility` — saat kehilangan kelayakan, sisa interval layak
     (`chunks`) dibayarkan sekalian.
  3. `endSession` — sisa interval layak terakhir (`chunks`) ikut dibayar.
- **Pembersihan accounting yang lama**: blok lama `endSession` yang menambah
  `voiceMinutes` dari **total durasi sesi** (`Math.floor(seconds / 60)`)
  dihapus. Itu salah sasaran: menghitung seluruh waktu (termasuk masa tidak
  layak), tidak searah dengan pembayaran poin yang cuma untuk masa layak.
  Kini `voiceMinutes` selalu berasal dari interval layak yang sama dengan
  yang membayar Poruv/XP, jadi tidak ada over/under-count.

**`src/config/constants.js`**
- `VOICE.INTERVAL_MINUTES` (15) — turunan dari `INTERVAL_MS`, dipakai sebagai
  satuan menit tiap interval.

**Dokumentasi**: `Docs/ToDoV3.md` baris bug `voiceMinutes` ditandai SELESAI
dengan keputusan di atas.

Verifikasi: `npm run lint` bersih, `npm test` hijau.

## Gelombang Delapan — Sistem Staff: `/staff`, `/staff-rating`, `/best-staff-of-the-month`

Permintaan owner: sistem staff yang dikelola **manual lewat command admin**,
bukan diturunkan dari role Discord — lengkap dengan rating dari member dan
leaderboard bulanan aktivitas. Planning di `Docs/ToDoV3.md` sudah menjadi
bahan eksekusi.

**Database (`src/database/schema.js`)**
- Tabel `staff`: `userId, guildId, divisi, deskripsi, addedAt, addedBy`
  (PK user+guild — satu orang satu baris per server).
- Tabel `staff_ratings`: `staffUserId, raterUserId, guildId, stars, comment,
  createdAt, updatedAt` dengan PK unik `(staffUserId, raterUserId, guildId)` —
  1 user cuma boleh 1 rating per staff; memberi ulang = memperbarui
  (`ON CONFLICT ... DO UPDATE`), bukan nambah baris.
- Tabel `staff_activity`: `userId, guildId, yearMonth, messageCount,
  voiceMinutes, tagCount, announcementCount` (PK user+guild+bulan). Baris baru
  per bulan = skor otomatis reset tiap ganti bulan, histori bulan lalu tetap
  tersimpan.

**Lapis data (`src/database/staff.js`, baru)**
- CRUD: `isStaff`, `addStaff` (tolak duplikat), `removeStaff`, `getStaff`,
  `listStaff` (kelompok per divisi, urut addedAt).
- Rating: `setRating` (tolak menilai diri sendiri & non-staff).
- Aktivitas: `getActivity` (inisialisasi baris bulan), `bumpActivity`,
  `addVoiceMinutes`.
- **`bestStaff`**: 4 metrik tiap-tiap dinormalisasi ke nilai tertinggi bulan
  itu (nilai dibagi max → rentang 0-1) **baru** dirata-rata sama rata (25%
  masing-masing). Ini menjawab concern "satuannya beda" — staff yang seimbang
  tidak kalah otomatis hanya karena staff lain menumpuk satu metrik, dan
  skor tidak dijumlah mentah. Tabel digabungkan ke `staff` (JOIN) jadi hanya
  staff yang tampil; 1 leaderboard gabungan, tidak dipisah per divisi.

**Command (`src/commands/staff/`, baru; auto-register via readdir `index.js`)**
- `/staff-set` (**admin**, `PermissionFlagsBits.Administrator`): subcommand
  `add` (`user`, `divisi` wajib, `deskripsi` opsional) & `remove` (`user`).
- `/staff`: daftar staff per divisi — nama, deskripsi, rata-rata bintang rating
  (`⭐` + nilai desimal) — pagination `staff_page` memakai `pagerRow`
  (`src/ui/pager.js`); tombol di-wire ke `interactionCreate.js` (pattern sama
  dengan `credit_page`). Membangun `buildStaff(guildId, page)` yang dipakai
  command & handler tombol.
- `/staff-rating <user> <stars 1-5> [comment]`: simpan/memperbarui rating.
- `/best-staff-of-the-month [bulan]`: argumen `bulan` opsional dengan pilihan
  3 bulan terakhir (default bulan berjalan), menampilkan 1-2-3 dengan medal
  dan skor (0-100) + rincian 4 metrik per staff. Kosong kalau bulan itu belum
  ada aktivitas.

**Tracking & hooks**
- `messageCreate.js`: cabang baru di atas gate `POINT_CHANNEL_ID` — kalau
  pengirim adalah staff (`isStaff`), increment `messageCount`; kalau
  `message.mentions.everyone` atau `message.mentions.roles.size > 0`,
  increment `tagCount`; kalau `message.channelId` ada di
  `ANNOUNCEMENT_CHANNEL_IDS`, increment `announcementCount`. Berdiri sendiri
  (jalan di semua channel, tidak terkunci channel poin) tapi tetap lewat
  `shouldCountMessage` (anti-spam) supaya spam tidak menggelembungkan skor.
- `voiceStateUpdate.js`: di `endSession`, kalau user staff dan sesinya
  berakhir dalam kondisi `eligible` (minimal 2 orang tidak deaf — syarat sama
  dengan Poruv), `addVoiceMinutes(userId, guildId, floor(seconds/60))`. Sama
  seperti `voice_seconds` yang ada, menit diakumulasikan saat sesi berakhir
  (bukan tiap interval), jadi konsisten tanpa double-count.

**Env & dokumentasi**
- `ANNOUNCEMENT_CHANNEL_IDS` (baru, comma-separated, opsional) ditambah ke
  `.env.example` dan tabel env `README.md`. Kosong = tidak ada pesan yang
  dihitung sebagai announcement.
- `Docs/Bot.md` & `Docs/ai.md`: 4 command + narasi cara kerja staff
  (manual, rating hanya info, skor normalisasi). `Docs/ToDoV3.md`: bagian
  fitur staff ditandai SELESAI.

**Verifikasi**: `test/staff.test.js` (baru, DB temp terisolasi, 9 kasus) —
CRUD, penolakan duplikat, group divisi, rating replace-once, self/non-staff
tolak, bump metrik, voice minutes, dan **bestStaff**: tes sengaja membandingkan
staff dengan banyak pesan tapi metrik lain nol lawan staff seimbang — yang
seimbang harus menang karena normalisasi (menjaga proporsi). `npm run lint`
bersih, `npm test` 100/100 hijau — tapi lihat catatan **Perbaikan** di bawah:
suite ini hanya menguji `src/database/staff.js`, tidak menyentuh
`messageCreate.js`, jadi bug pemanggilan ganda di bawah ini lolos tanpa
terdeteksi test.

**Perbaikan (review sebelum deploy)**

- **Bug kritis: Poruv/XP chat berhenti total.** `messageCreate.js` memanggil
  `shouldCountMessage()` dua kali per pesan — sekali untuk staff tracking,
  sekali lagi untuk Poruv/XP. Fungsi itu stateful: tiap panggilan langsung
  mencatat `lastAt = now` untuk user itu (lihat `src/lib/antispam.js`).
  Panggilan kedua jadi selalu mengira jaraknya 0ms dari panggilan pertama
  (pesan yang sama), sehingga selalu dianggap spam dan `false` — **Poruv dan
  XP dari chat berhenti untuk semua orang**, bukan cuma staff, sejak
  perubahan ini masuk. Dibuktikan lewat simulasi standalone sebelum
  diperbaiki: dua pesan beda konten berjarak 5 detik pun tetap `false` di
  panggilan kedua. Perbaikannya: panggil `shouldCountMessage()` **sekali**
  di awal handler, simpan hasilnya ke variabel `counts`, pakai ulang untuk
  kedua pengecekan (staff tracking dan Poruv/XP) — bukan dua evaluasi
  terpisah untuk hal yang seharusnya satu keputusan yang sama.
- **Typo `"announcemen"` → `"announcement"`** di baris rincian metrik
  `bestStaffOfTheMonth.js`.
- **2 emoji baru**: `staff` dan `star_rating` (ID dari upload owner) di
  `src/lib/emojis.js`. Dipakai gantikan `person`/`⭐` unicode di keempat
  command staff (`staffSet.js`, `staff.js`, `staffRating.js`,
  `bestStaffOfTheMonth.js`), konsisten dengan pola bot yang selalu pakai
  custom emoji server, bukan unicode, untuk elemen UI utama.
- Dicatat, belum diperbaiki: `voiceMinutes` staff hanya tercatat saat
  `endSession` (user keluar voice) — staff yang duduk berjam-jam tanpa
  pernah leave channel tidak dapat kredit sampai dia keluar, beda dari
  `voice_seconds` biasa yang juga diperbarui via interval periodik. Perlu
  diputuskan apakah ini disengaja atau perlu disamakan — dicatat di
  [ToDoV3.md](ToDoV3.md).

**Desain ulang `/staff`: satu staff per halaman**

Owner menilai tampilan awal (semua staff dikelompokkan per divisi dalam satu
embed) kurang niat. Dirombak jadi mengikuti pola `/credit`: satu orang = satu
halaman, navigasi lewat tombol.

- `src/commands/staff/staff.js` ditulis ulang total. `flattenStaff()`
  meratakan hasil `listStaff()` (yang dikelompokkan per divisi) jadi satu
  daftar urut, lalu `paginate(all, page, 1)` — memakai fungsi pagination yang
  sama dipakai `/shop`/`/leaderboard`, cukup dengan `size: 1` supaya satu
  halaman = satu orang, tidak perlu logic pagination baru.
- Tiap halaman sekarang berisi: **avatar asli** staff (fetch lewat
  `client.users.fetch()`, pola yang sama dipakai `leaderboardCard.js`;
  gagal fetch tidak menggagalkan embed, cuma thumbnail kosong), divisi di
  judul, deskripsi, rating sebagai baris bintang terisi/kosong
  (`⭐⭐⭐⭐☆` gaya, bukan cuma angka desimal), dan sampai 3 komentar
  rating terbaru sebagai kutipan.
- **Fungsi baru** `getRecentComments(staffUserId, guildId, limit)` di
  `src/database/staff.js` — sebelumnya rating cuma diagregat jadi rata-rata,
  komentar individual tidak pernah ditampilkan di mana pun. Sekarang
  `/staff` mengutip langsung suara member yang menilai (terbaru dulu, cuma
  yang komentarnya diisi).
- `buildStaff()` berubah signature dan jadi **async**: `buildStaff(client,
  guildId, page)`, bukan `buildStaff(guildId, page)` — perlu `client` untuk
  fetch avatar. Pemanggil di `interactionCreate.js` (`case 'staff_page'`)
  disesuaikan jadi `await`.
- `Docs/Bot.md` dan `Docs/ai.md`: paragraf staff diperbarui supaya tidak lagi
  bilang "dikelompokkan per divisi dalam satu embed".

## Gelombang Tujuh — Level-up di Semua Sumber, Plafon XP Chat, Sink Coin, & Equip Item

Gelombang ini gabungan perbaikan bug, balancing ekonomi, dan satu fitur
sistem equip. Semua dikerjakan di branch `ferr-path2`.

**Bug #8 — `xp_fill`/level-up menggantung kalau `POINT_CHANNEL_ID` diisi**
- Akar masalah: rekonsiliasi level (yang menset level, kasih reward, dan
  mengirim embed notifikasi) hanya ada di `src/events/messageCreate.js`, yang
  di-gate `POINT_CHANNEL_ID`. XP yang masuk dari jalur lain — item `xp_fill`,
  voice, reward boss — tidak pernah memicu level-up sampai user kebetulan
  chat lagi di channel poin.
- Fix: satu jalur bersama **`src/lib/levelingManager.js`** (baru) dengan
  `reconcileLevels(client, guildId, [{ userId, channelId? }])` yang menangani
  set level, reward poin/coin/item acak, role, quest `level_up`, dan
  mengumumkan level-up. Notifikasi dikirim ke `POINT_CHANNEL_ID` kalau terisi,
  kalau tidak ke channel konteks event atau channel teks pertama guild.
- Dipanggil dari **semua** sumber XP:
  - `messageCreate.js` (menggantikan `handleLevelUp` inline),
  - `src/commands/economy/use.js` (item/`xp_fill`),
  - `voiceStateUpdate.js` (tiga titik pemberian XP voice),
  - `bossManager.js` (saat hadiah boss dibagikan).
- Pesan `xp_fill` di `src/database/abilities.js` tidak lagi menjanjikan
  "tinggal chat sekali" karena level kini naik seketika di `/use`.

**Balancing — plafon XP chat per menit**
- Spam chat dengan cooldown anti-spam 3 detik bisa memompa ~400 XP/menit
  (20 pesan × 20 XP), jauh di atas chat aktif normal.
- `src/config/constants.js`: `CHAT.XP_CAP_PER_MINUTE: 200` +
  `XP_CAP_WINDOW_MS` (jendela bergulir 60 detik).
- `src/lib/xpCap.js` (baru): `capChatXp()` memotong XP (yang sudah dikali buff)
  ke plafon jendela bergulir; `resetXpCap()` dipakai Time Skip
  (`cooldown_reset` di `abilities.js`).
- `messageCreate.js` melewatkan XP yang di-buff melalui `capChatXp` sebelum
  `addXp`. Chat normal <200 XP/menit tak tersentuh.

**Balancing — biaya `/give` 5% benar-benar dibakar (sink coin)**
- Bug yang lama nyamar: `give.js` sudah memvalidasi `totalCost = amount + fee`,
  tapi `transferCoins()` hanya mendebit **sebesar `amount`** — biaya 5% bocor.
- Fix: `transferCoinsWithFee()` baru di `src/database/users.js` — dalam satu
  transaksi mendebit `amount + fee` dari pengirim dan mengkredit `amount` ke
  penerima; `fee` dibakar (sink coin). Dipakai `/give`.
- `GIVE_FEE_RATE` dipindah ke `src/config/constants.js` (mengikuti konvensi
  "semua angka di constants"). Test `test/give.test.js` (baru, DB temp
  terisolasi) membuktikan fee benar-benar terpotong.

**Balancing — rebalance harga Plasma Blaster & Crystal Dagger**
- Keduanya overpriced (18.000/15.000 coin) vs buff yang kena plafon 20 XP/pesan.
- `src/database/shopCatalog.js`: **Plasma Blaster** 18.000 → **4.500 coin**
  (×1.25 → **×1.3**, 60 menit), **Crystal Dagger** 15.000 → **3.500 coin**
  (×1.2, 60 menit). Keduanya tetap tier **Rare** (via `ITEM_TIERS`).
- Harga item tidak disinkron otomatis dari katalog (hanya `effect` lewat
  `syncEffects`), jadi tambah `shop.rebalancePrices()` (`src/database/shop.js`)
  yang dipanggil startup memakai `SHOP_CATALOG.REBALANCED_ITEM_IDS = [11, 12]`
  supaya DB yang sudah seed ikut dapat harga baru.

**Quest `boss_join` & `boss_kill` (tandai selesai, tanpa perubahan kode)**
- Ternyata sudah terimplementasi penuh: katalog `boss_join_1` (daily) &
  `boss_kill_2` (weekly) di `src/lib/quests.js`; `addQuestProgress('boss_join')`
  di `bossManager.js` saat serangan pertama (`result.hits === 1`), dan
  `addQuestProgress('boss_kill')` saat hadiah dibagikan. Hanya dicentang di
  `Docs/ToDoV3.md`.

**Fitur — sistem equip item (5 slot) + `/equip`**
- Model yang dipilih: equip sebagai **penanda build/carpool** — efek item
  **tetap aktif lewat `/use`**; kolom status equip siap dipakai untuk mekanik
  pasif kelak.
- `src/database/schema.js`: migrasi kolom `equipped INTEGER DEFAULT 0` di
  `user_items`.
- `src/config/constants.js`: `EQUIP_SLOTS = 5`.
- `src/database/shop.js`: `setEquipped()` (equip/unequip, cek slot 5, item
  sudah terpasang ditolak), `getEquipCount()`, dan `getInventory()` kini memuat
  `ui.equipped`. Ketemu & diperbaiki bug saat tes: SELECT awal tidak menyertakan
  `equipped`, sehingga pengecekan "sudah terpasang" tak berfungsi.
- `src/commands/economy/equip.js` (baru): `/equip equip|unequip <id>` —
  auto-register via `readdirSync` di `index.js`.
- `src/commands/economy/inventory.js`: menampilkan counter `dipasang X/5`,
  badge "Terpasang", dan perintah equip/unequip per item.
- Test `test/equip.test.js` (baru, DB temp terisolasi, 5 kasus).

Dokumentasi pengguna disinkronkan di `Docs/Bot.md`, `Docs/ai.md`, dan
`Docs/ToDoV3.md`. Changelog resmi tidak disentuh (file `Changelog(...).md`
memang memberi tahu agar tidak diupdate).

Verifikasi per bagian: `npm run lint` bersih dan `npm test` **91/91** hijau.

## Gelombang Enam — `/exchange` Hilang, Poin Jadi Poruv, Ada `/poruv-shop`

Permintaan owner: hapus `/exchange`, rename "poin" jadi "Poruv" di seluruh
tampilan, dan bikin **Poruv** benar-benar berguna lewat `/poruv-shop` — 4
item: Owocash 1.000.000, Custom Role, E-Wallet 25.000, Item Mythic acak.

**`/exchange` dihapus**
- File `src/commands/economy/exchange.js` dan asset `assets/emoji/exchange.png`
  dihapus. Emoji `exchange` dan `EXCHANGE_RATE` dicopot dari
  `src/lib/emojis.js` / `src/config/constants.js`.
- Semua referensi teks & komentar ke `/exchange` di `shopCatalog.js`,
  `points.js`, `weekly.js`, `embeds.js`, `balance.js`, `guidePages.js`,
  `ai.md`, `Bot.md`, `README.md` dibersihkan atau diganti jalur baru
  (`/poruv-shop`).

**Rename "Poin" → "Poruv" (tampilan saja)**
- Kolom database (`points`), nama fungsi (`addPoints`, `getPoints`), dan
  nama command (`/points`) **tidak diubah** — supaya tidak perlu migrasi
  data. Yang berubah cuma teks yang tampil ke user: embed, footer, label
  leaderboard, deskripsi item, teks buff/debuff.
- Disentuh: `points.js` (command), `guidePages.js`, `bossEmbeds.js`,
  `leaderboard.js`, `profile.js`, `leaderboardCard.js`, `admin.js`,
  `abilities.js`, `bossAttacks.js`, `buffs.js`, `shopCatalog.js`,
  `embeds.js`.
- **Ketemu bug lama saat rename**: `guidePages.js` menulis voice = "+5 poin"
  per 15 menit, padahal `constants.js` (`VOICE.POINTS_PER_INTERVAL`) sudah
  lama bernilai **8**. Sekalian dibetulkan jadi "+8 Poruv" — dan proyeksi
  income harian/mingguan/bulanan di `ai.md` & komentar `constants.js`
  dihitung ulang pakai angka yang benar (dampaknya kecil, harga item tidak
  berubah).

**`/poruv-shop` — fitur baru**
- `src/config/constants.js`: array `PORUV_SHOP`, 4 item dengan harga
  ditentukan langsung oleh owner:

  | Item | Harga | Fulfillment |
  |---|---|---|
  | Item Mythic (Acak) | 2.500 Poruv | Otomatis, masuk `/inventory` |
  | Owocash 1.000.000 | 5.000 Poruv | Manual — admin |
  | Custom Role | 10.000 Poruv | Manual — admin |
  | E-Wallet 25.000 | 15.000 Poruv | Manual — admin |

  Perkiraan waktu tebus tiap item (bukan dasar penentuan harga, cuma
  gambaran) ada di [ai.md](ai.md#3b-poruv-shop).
- `src/database/schema.js`: tabel baru `poruv_redemptions` (status
  `pending`/`fulfilled`, dicatat per klaim).
- `src/database/points.js`: fungsi baru `spendPoints()` — beda dari
  `addPoints(-jumlah)` karena **tidak** ikut tercatat ke snapshot
  `weekly_points`. Belanja bukan "pendapatan mingguan negatif".
- `src/database/poruvShop.js` (baru): `redeemPoruvItem()` memotong Poruv +
  mencatat klaim dalam satu `db.transaction()` — tidak mungkin Poruv
  terpotong tanpa tercatat. Item Mythic diundi dari katalog `/shop` yang
  sudah ada (filter tier `Mythic`, `weightedRandom()` yang sama dengan
  sistem loot lain) lalu langsung `grantItem()` ke inventori.
- `src/commands/economy/poruvShop.js` (baru): command `/poruv-shop`
  menampilkan 4 item + tombol redeem (disabled otomatis kalau Poruv kurang).
  Tampilan sengaja tidak pakai emoji `error`/silang untuk item yang belum
  terjangkau — tombol yang disabled dan harganya sudah cukup jelas, jadi
  tanda "gagal" di UI cuma bikin shop terasa negatif tanpa nambah info.
- `src/events/interactionCreate.js`: handler tombol `poruv_redeem:<key>`
  didaftarkan, memanggil `handleRedeem()` di command.

**Notifikasi admin: DM, bukan mention channel**
- Env baru (tidak wajib): `ADMIN_ROLE_IDS` (comma-separated role ID). Saat
  klaim manual (bukan item Mythic) masuk, bot **DM langsung** tiap member
  yang punya salah satu role di `ADMIN_ROLE_IDS` — bukan mention role di
  channel. `notifyAdmins()` di `poruvShop.js` ambil member dari
  `role.members` (fetch guild sekali kalau cache kosong), dedupe kalau satu
  admin punya lebih dari satu role admin, lalu DM semuanya paralel lewat
  `Promise.allSettled`. Kalau `ADMIN_ROLE_IDS` kosong, tidak ada notifikasi
  — klaim tetap tercatat, cuma tidak ada yang diberi tahu otomatis.
  Kegagalan DM per orang (DM ditutup, dst) tidak menggagalkan redeem atau
  DM ke admin lain.
- `.env.example` dibuat dari nol (belum pernah ada di project ini) berisi
  semua variabel yang didokumentasikan di README, termasuk `ADMIN_ROLE_IDS`.

**3 emoji baru**
- `src/lib/emojis.js`: `owocash`, `wallet`, `role`, ID sesuai upload owner.

**Belum ada**: cara admin menandai klaim manual sebagai selesai lewat
Discord (misal tombol "Sudah Diproses"). Untuk sekarang, `resolveRedemption()`
di `poruvShop.js` sudah ada sebagai fungsi database, tapi belum ada command
yang memanggilnya — admin masih perlu update status lewat query manual kalau
mau menandai `fulfilled`. Dicatat sebagai kandidat gelombang berikutnya.

## Gelombang Lima — `/credit` Jadi 3 Halaman

Permintaan owner: `/credit` yang tadinya satu embed panjang dipecah jadi
3 halaman dengan tombol navigasi, plus role baru (Server Manager, Idea
Master, Boss Artwork) yang sebelumnya belum ada tempatnya.

**Struktur 3 halaman**
- `src/commands/general/credit.js` dibongkar total: dari satu array `CREDITS`
  datar jadi `PAGES` (3 objek: Developer, Executive, Beta Tester), masing-
  masing berisi beberapa `groups` (role + daftar member).
  - Halaman 1 — **Developer**: Backend (2 orang), Frontend (1 orang).
  - Halaman 2 — **Executive**: Server Manager (2), Idea Master (1),
    Boss Artwork (1), UI/UX & Aset Emoji (1).
  - Halaman 3 — **Beta Tester**: 8 orang.
- Navigasi pakai `pagerRow()` yang sama dengan `/shop` dan `/leaderboard`
  (`src/ui/pager.js`) — state tersimpan di customId (`credit_page:<halaman>`),
  jadi tombol tetap jalan walau bot restart.
- Handler tombol `credit_page` ditambahkan di `src/events/interactionCreate.js`,
  memanggil `buildCredit(page)` yang diekspor dari `credit.js`.

**4 emoji role baru**
- `src/lib/emojis.js`: tambah `idea`, `betatester`, `artwork`,
  `servermanager` ke `REGISTRY`, ID sesuai upload owner. Fallback unicode
  disiapkan (`💡` `🧪` `🖌️` `🛡️`) kalau ID kosong/salah.

**Baris "dibangun oleh" dipangkas**
- Awalnya menampilkan seluruh 14 orang unik di semua halaman — kepanjangan
  dan bikin peran lain (Server Manager, Idea Master, dst) numpuk di baris
  yang sama padahal sudah ada field sendiri.
- Diganti ke `CORE_IDS`: hanya role **Backend, Frontend, dan Boss Artwork**
  yang dirangkum di baris ini, diambil langsung dari `PAGES` biar tetap
  sinkron kalau member role tersebut diganti. Role lain tetap muncul,
  hanya lewat field masing-masing, bukan diulang di baris pembuka.

**Belum otomatis**: `members` di `credit.js` masih diisi manual (Discord
User ID per orang). Kalau ada pergantian tim, edit array-nya langsung —
lihat [Contributor.md](Contributor.md#credit-3-halaman).

## Gelombang Empat — Jadwal Spawn & Tampilan Boss

Permintaan langsung dari owner: jadwal spawn boss dikembalikan sesuai teks
yang sudah tertulis di bot, dan gambar boss diperbesar.

**Spawn boss jam 12 malam & 12 siang**
- `BOSS.SPAWN_HOURS` di `src/config/constants.js` diubah
  **[12, 20] → [0, 12]**. Boss sekarang muncul pukul **00:00 dan 12:00**
  waktu lokal event (`BOSS.UTC_OFFSET`), sesuai teks "12 malam & 12 siang"
  yang memang sudah tertulis di `src/events/ready.js`,
  `src/lib/bossManager.js`, dan `src/ui/guidePages.js` — teksnya tidak perlu
  diubah sama sekali karena kode yang sebelumnya melenceng.
- Komentar di `src/config/constants.js` dan tes jadwal di
  `test/boss.test.js` disinkronkan (slot `…T00` dan `…T12`, verifikasi lewat
  waktu UTC 17:00 = 00:00 WIB dan 05:00 = 12:00 WIB).
- Karena penjadwal tahan restart (`dueSpawnSlot()` + `slotUsed()` di
  `src/lib/boss.js`), perubahan langsung berlaku begitu bot dinyalakan ulang;
  spawn lama di jam 20:00 tidak akan "menyusul".

**Gambar boss besar, bukan thumbnail**
- Kelima embed di `src/ui/bossEmbeds.js` (spawn, damage update, selesai,
  dan dua embed status) yang sebelumnya `embed.setThumbnail(icon.url)`
  diganti ke `embed.setImage(icon.url)`. Gambar boss sekarang tampil lebar
  di dalam embed, bukan ikon kecil di pojok kanan atas.
- Tidak ada perubahan ukuran aset — Discord yang mengatur rendering; file
  di `assets/` dipakai apa adanya.

Verifikasi: `npm test` hijau **76/76**.

## Perbaikan — Dupe Buff Sturdy

- **Bug**: Adamantine Ingot (`no_consume` / Sturdy) melindungi dirinya sendiri.
  Ingot kedua dipakai saat Sturdy aktif tidak ikut berkurang, tapi tetap
  menambah 3 charge baru — satu ingot bisa jadi buff tak terbatas.
- **Fix**: `useItem()` melewati `consumeCharge` kalau item yang dipakai justru
  pemberi `no_consume`, jadi ingot selalu terpakai saat dipakai.
- **Fix**: `consumeCharge` dipindah ke dalam transaksi `/use` supaya charge
  tidak hangus kalau pemakaian gagal di tengah jalan.
- **Fix**: `addBuff` menggabungkan buff berbasis charge tanpa durasi ke baris
  yang sudah ada (3 + 3 = 6 sisa jatah), bukan bikin baris menumpuk.
