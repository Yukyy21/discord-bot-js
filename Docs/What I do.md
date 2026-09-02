# What I do

Pengganti [Changelog.md](Changelog.md) — file lama itu sudah kepanjangan,
jadi mulai gelombang ini catatan perubahan lanjut di sini. Formatnya sama:
perubahan diceritakan per gelombang, angka merujuk ke kode, bukan dihafal.

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
