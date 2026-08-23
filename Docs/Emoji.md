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

Dipakai oleh `/credit` dan `/botinfo`:

| Key | Emoji |
|---|---|
| `backend` | `<:Backend:...>` |
| `frontend` | `<:Frontend:...>` |
| `person` | `<:Dev_human:...>` |
| `developer` | `<a:developer:...>` (animated) |
| `nodejs` | `<:Nodejs:...>` |
| `discordjs` | `<:Discordjs:...>` |
| `database` | `<:Sql_database:...>` |

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
| `boss` | `<:boss:...>` | Disiapkan untuk mini boss (belum dipakai) |
| `boss_hp` | `<:bosshp:...>` | Disiapkan untuk mini boss (belum dipakai) |
| `boss_loot` | `<:lootboss:...>` | Disiapkan untuk mini boss (belum dipakai) |

Tiga key boss sengaja hanya terdaftar di registry — sistem mini boss belum ada,
jadi belum dipasang di command mana pun.

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
