# Panduan Kontributor

## Setup

```bash
npm install
cp .env.example .env
```

Buat aplikasi bot sendiri di [Discord Developer Portal](https://discord.com/developers/applications)
dan pakai server pribadi untuk testing — jangan pernah menguji di server produksi.
Isi `GUILD_ID` dengan server test supaya command langsung muncul tanpa menunggu
penyebaran global.

```bash
npm run deploy   # hanya kalau nama/opsi command berubah
npm start
```

## Cek Sebelum Commit

```bash
npm test        # node:test, fungsi murni (level, daily, tier, emoji item)
npm run lint    # ESLint 9 flat config
npm run format  # Prettier
```

Logika baru yang murni (tanpa Discord/SQL) sebaiknya ditaruh di `src/lib/`
lalu dites di `test/<nama>.test.js`.

## Menambah Command Baru

1. Buat file di `src/commands/<kategori>/<nama>.js`. Kategori yang ada:
   `economy`, `points`, `general`. Loader membaca folder secara otomatis.
2. Ekspor `data` (SlashCommandBuilder) dan `execute(interaction)`.
3. Jalankan `npm run deploy`.

```js
const { SlashCommandBuilder } = require('discord.js');
const { themedEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder().setName('contoh').setDescription('Contoh command'),
  async execute(interaction) {
    const embed = themedEmbed('info', 'Judul', COLORS.neutral)
      .setDescription(`${e('info')} Isi pesan`);
    await interaction.reply({ embeds: [embed] });
  },
};
```

## Aturan Main

**Query database lewat `src/database/`.** Jangan menulis SQL di dalam command.
Kalau butuh query baru, tambahkan fungsi di file domain yang sesuai
(`users.js`, `points.js`, `shop.js`) dan ekspor dari `index.js`.

**Angka balancing masuk `src/config/constants.js`.** Kalau menulis angka
telanjang di tengah logika (rate Poruv, harga, cooldown), pindahkan ke sana.

**Emoji lewat `e()` / `eo()`.** Jangan tempel unicode atau ID mentah di command.

**Tampilan lewat `src/ui/embeds.js`.** Pakai `themedEmbed()` dan warna dari
`COLORS` supaya semua pesan konsisten. Untuk daftar panjang, pakai
`paginate()` + `pagerRow()`.

**State pagination masuk `customId`, bukan memori.** Format yang dipakai
`aksi:a:b`, lalu ditangani di `src/events/interactionCreate.js`. Ini yang bikin
tombol pada pesan lama tetap jalan setelah bot restart.

**Balasan error dan pesan khusus pengirim pakai `MessageFlags.Ephemeral`.**
Bukan `ephemeral: true` — opsi itu sudah deprecated di discord.js v14.

**Operasi yang lebih dari ~2 detik harus `deferReply()` dulu.** Semua render
kartu sudah melakukannya; token interaksi hangus setelah 3 detik.

## Gaya Kode

- CommonJS (`require`), 2 spasi, titik koma, kutip satu.
- Nama fungsi dan variabel dalam bahasa Inggris; komentar bahasa Indonesia.
- Komentar hanya untuk menjelaskan **kenapa**, bukan mengulang isi kode.
  Batasan API Discord, keanehan SQLite, dan keputusan balancing layak
  dikomentari. `// ambil user` di atas `getUser()` tidak.
- Command sebaiknya tipis: validasi input, panggil helper, kirim balasan.

## Credit (3 Halaman)

`/credit` (`src/commands/general/credit.js`) menampilkan 3 halaman lewat
`pagerRow('credit_page', ...)`, ditangani di `interactionCreate.js` seperti
pager lainnya (state di customId, bukan memori):

1. **Developer** — Backend, Frontend
2. **Executive** — Server Manager, Idea Master, Boss Artwork, UI/UX & Aset Emoji
3. **Beta Tester** — daftar tester

Untuk menambah/mengganti orang, edit array `PAGES` di `credit.js` — isi
`members` dengan Discord User ID (string), tidak perlu sentuh bagian render:

```js
{
  role: 'Backend',
  emoji: 'backend',
  members: ['123456789012345678', '234567890123456789'],
},
```

Emoji role baru didaftarkan dulu di `REGISTRY` pada `src/lib/emojis.js`
(lihat [Emoji.md](Emoji.md)), baru dipakai lewat key-nya di `credit.js`.

## Sebelum Kirim PR

- `npm test` dan `npm run lint` lolos.
- Bot bisa start tanpa error dan command yang disentuh berhasil dijalankan.
- Perilaku baru sudah tercatat di [Bot.md](Bot.md).
- Item yang selesai dicoret dari [ToDo.md](ToDo.md).
- Tidak ada token, ID pribadi, atau `data/*.db` yang ikut ter-commit.
