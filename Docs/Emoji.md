# Sistem Emoji

Semua emoji bot dipanggil lewat nama, bukan ditulis langsung di command:

```js
const { e } = require('../../lib/emojis');

`${e('coin')} 1.500` // -> <:coin:1234567890> 1.500
```

Kalau nama tidak dikenal, helper mengembalikan string kosong — pesan tetap
terkirim, hanya tanpa ikon. Tidak ada command yang error gara-gara emoji.

## Mengganti Emoji

1. Upload emoji ke aplikasi bot (Developer Portal > Emojis) atau ke server.
2. Ambil ID-nya: ketik `\:nama:` di Discord, hasilnya `<:nama:123456789>`.
3. Tambahkan ke `EMOJI_IDS` di `src/config/index.js`.

Nama yang belum diisi akan jatuh ke padanan unicode di `src/lib/emojis.js`.

## Helper

| Fungsi | Kegunaan |
|---|---|
| `e(nama)` | String emoji siap tempel di teks embed |
| `eo(nama)` | Bentuk objek `{ id, name }` untuk tombol dan select menu |
| `medal(index)` | Medali emas/perak/perunggu untuk tiga besar, sisanya nomor urut |
| `tierEmoji(tier)` | Ikon tier rank (Novice … Demigod) |

## Emoji Credit & Info Bot

Dipakai oleh `/credit` dan `/botinfo`. `/credit` sekarang 3 halaman
(Developer, Executive, Beta Tester) lewat `pagerRow('credit_page', ...)` —
lihat [Contributor.md](Contributor.md#credit-3-halaman) untuk cara menambah
anggota baru.

| Key | Emoji | Dipakai di |
|---|---|---|
| `backend` | `<:Backend:...>` | Halaman 1 — role Backend |
| `frontend` | `<:Frontend:...>` | Halaman 1 — role Frontend |
| `person` | `<:Dev_human:...>` | Baris "dibangun oleh", role UI/UX & Aset Emoji |
| `developer` | `<a:developer:...>` (animated) | Judul halaman 1 (Developer) |
| `servermanager` | `<:Servermanager:...>` | Halaman 2 — role Server Manager |
| `idea` | `<:Idea:...>` | Halaman 2 — role Idea Master |
| `artwork` | `<:Designer:...>` | Halaman 2 — role Boss Artwork |
| `betatester` | `<:Betatester:...>` | Judul & isi halaman 3 (Beta Tester) |
| `nodejs` | `<:Nodejs:...>` | `/botinfo` |
| `discordjs` | `<:Discordjs:...>` | `/botinfo` |
| `database` | `<:Sql_database:...>` | `/botinfo` |

## Emoji Poruv Shop

Dipakai oleh `/poruv-shop` — lihat [Bot.md](Bot.md#poruv-shop) untuk cara
kerja redeem-nya.

| Key | Emoji | Dipakai di |
|---|---|---|
| `owocash` | `<:Owocash:...>` | Item "Owocash 1.000.000" |
| `wallet` | `<:wallet:...>` | Item "E-Wallet 25.000" |
| `role` | `<:Role:...>` | Item "Custom Role" |
| `inventory` | `<:tas:...>` | Item "Item Mythic (Acak)" (dipakai ulang dari ikon inventori) |

## Emoji Sistem Staff

Dipakai oleh `/staff`, `/staff-set`, `/staff-rating`, `/best-staff-of-the-month`
— lihat bagian **Staff** di [Bot.md](Bot.md) untuk cara kerjanya.

| Key | Emoji | Dipakai di |
|---|---|---|
| `staff` | `<:Staff:...>` | Judul embed & baris deskripsi di `/staff`, `/staff-set` |
| `star_rating` | `<:StarRating:...>` | Bintang rating di `/staff-rating`, daftar `/staff`, dan `/best-staff-of-the-month` |

## Emoji AI (`/ai-ask`)

| Key | Emoji | Dipakai di |
|---|---|---|
| `ai_think` | `<a:Aithink:...>` (animated) | Embed "sedang mikir" saat pertanyaan diproses |
| `ai_answer` | `<a:Aiask1:...>` (animated) | Judul & blok jawaban `/ai-ask` |
| `ai_answer2` | `<a:aiask2:...>` (animated) | Baris penutup jawaban |

## Emoji Rotate Status

| Key | Emoji | Dipakai di |
|---|---|---|
| `status_online` | `<a:Online:...>` (animated) | Terdaftar, belum dipakai di teks Custom Status (lihat catatan) |
| `status_server` | `<:Server:...>` | Terdaftar, belum dipakai di teks Custom Status (lihat catatan) |
| `status_ontop` | `<a:Ontop:...>` (animated) | Terdaftar, belum dipakai di teks Custom Status (lihat catatan) |
| `status_command` | `<:Command:...>` | Terdaftar, belum dipakai di teks Custom Status (lihat catatan) |

**Discord tidak merender custom emoji di teks Custom Status bot** — cuma
tampil sebagai teks mentah `<:nama:id>`, ini keterbatasan resmi Discord API.
Karena itu rotasi status di `src/lib/statusRotator.js` pakai emoji unicode
biasa (🟢🌐🔝⌨️ dst), bukan 4 key di atas. Key-key ini tetap didaftarkan di
registry buat dipakai di tempat lain nanti (embed, dll) kalau dibutuhkan.
Detail cara kerja rotasinya di [Bot.md](Bot.md#rotate-status-bot).

## Emoji Navigasi, Quest, Ability & Boss

| Key | Emoji | Dipakai di |
|---|---|---|
| `back` | `<:Back:...>` | Tombol "Sebelumnya" di pager |
| `next` | `<:Next:...>` | Tombol "Berikutnya" di pager |
| `cancel` | `<a:cancel:...>` (animated) | Tombol tutup `/guide` |
| `quest` | `<:quest:...>` | `/quest` dan halaman Quest di `/guide` |
| `ability` | `<:ability:...>` | Ikon universal semua ability item (`/use`) |
| `buff` | `<:buff:...>` | Judul embed `/buffs` |
| `buff_active` | `<a:Buffactive:...>` (animated) | Tiap baris buff yang sedang aktif |
| `boss` | `<:boss:...>` | Judul embed boss, tombol serang (fallback), hasil serangan |
| `boss_hp` | `<:bosshp:...>` | Baris HP boss |
| `boss_loot` | `<:lootboss:...>` | Bagian hadiah & loot boss |
| `boss_hit` | `<:bosshit:...>` | Ikon tombol **Serang!** (ID opsional) |

## Ikon Gambar Boss

Selain emoji, tiap mini boss punya **gambar** sendiri di `assets/boss/`
(`pump_freakin.png`, `clown_orca.png`, `ancient_mummy.jpeg`). Nama filenya
didaftarkan di field `icon` pada `src/lib/bossCatalog.js`.

```js
const { bossIconFiles } = require('../ui/bossEmbeds');

channel.send({ embeds: [bossEmbed(row)], files: bossIconFiles(row.bossKey) });
```

| Fungsi (`src/lib/bossIcons.js`) | Kegunaan |
|---|---|
| `bossIcon(key)` | `{ file, name, url }` — `url` berupa `attachment://boss-<key>.png` |
| `bossIconFiles(key)` | Array `files` siap dipakai di `send` / `update` / `edit` |
| `bossIconPath(key)` | Path absolut file ikon, `null` kalau tidak ada |

Discord tidak bisa memuat file lokal lewat URL, jadi lampirannya **wajib
dikirim ulang setiap kali embed boss di-edit** — kalau tidak, thumbnail-nya
hilang. Kalau file ikon tidak ditemukan, helper mengembalikan `null`/`[]` dan
embed tetap terkirim tanpa gambar.

## Emoji Item Shop

Ikon tiap item shop terpisah di `src/lib/itemEmojis.js` (sumber ID:
`assets/items/emoji_itam.md`, gambar mentah di `assets/items/`).

```js
const { itemEmoji, tierMark } = require('../../lib/itemEmojis');

`${itemEmoji('Chrono Core')} ${tierMark('Mythic')} Chrono Core`
```

| Fungsi | Kegunaan |
|---|---|
| `itemEmoji(nama)` | Mention emoji item; fallback `📦` kalau nama tidak dikenal |
| `itemEmojiObject(nama)` | Bentuk objek untuk tombol / select menu |
| `tierMark(tier)` | Bulatan warna rarity (⚪🟢🔵🟣🟠🔴) — dipakai `/inventory` & `/buy`, tidak lagi di `/shop` |

Kunci peta harus sama persis dengan nama item di `src/database/shopCatalog.js`.
ID bisa di-override tanpa menyentuh file ini lewat `ITEM_EMOJI_IDS` di
`src/config/index.js` (formatnya `{ 'Chrono Core': '123...' }`).

`eo()` ada karena Discord tidak menerima string emoji di properti `emoji` pada
komponen — harus objek. Salah pakai di sini bikin tombolnya gagal dikirim.
