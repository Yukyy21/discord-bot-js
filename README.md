# Discord Economy & Points Bot

Bot Discord untuk server komunitas: member dapat poin dan XP dari ngobrol dan
nongkrong di voice, coin-nya dipakai belanja di shop yang stoknya berganti tiap
10 menit, dan progresnya ditampilkan lewat kartu gambar (`/profile`, `/rank`,
`/leaderboard card`).

## Jalankan

```bash
npm install
cp .env.example .env   # isi token & ID
npm run deploy         # daftarkan slash command (sekali, atau saat definisi berubah)
npm start
```

Butuh Node.js 18+ (bot memakai `fetch` bawaan Node).

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DISCORD_TOKEN` | ya | Token bot dari Developer Portal |
| `CLIENT_ID` | ya | Application ID, dipakai saat deploy command |
| `GUILD_ID` | tidak | Kalau diisi, command hanya didaftarkan ke server ini dan langsung muncul |
| `POINT_CHANNEL_ID` | tidak | Kalau diisi, poin chat hanya dihitung di channel ini |

Di Developer Portal, aktifkan **Message Content Intent** dan **Server Members
Intent**, lalu undang bot dengan scope `bot` + `applications.commands`.

## Struktur Folder

```
src/
  index.js          entry point: bikin client, muat command & event
  config/           konfigurasi manual (role level, override emoji) + angka balancing
  commands/         satu file per slash command, dikelompokkan per kategori
  events/           handler event Discord (pesan, voice, interaksi, ready)
  database/         SQLite: koneksi, skema, dan query per domain
  cards/            render gambar pakai canvas (profile, rank, leaderboard)
  ui/               embed, pagination, halaman /guide
  lib/              logika yang berdiri sendiri: emoji, rank, rotasi shop, path
scripts/            deploy-commands.js
assets/             background kartu, logo rank, sumber emoji
data/               economy.db + cache avatar (dibuat otomatis, tidak masuk git)
Docs/               dokumentasi lengkap
```

## Dokumentasi

- [Docs/Bot.md](Docs/Bot.md) — cara kerja bot, daftar command, aturan poin, arsitektur
- [Docs/Emoji.md](Docs/Emoji.md) — sistem custom emoji dan cara menggantinya
- [Docs/ToDo.md](Docs/ToDo.md) — yang masih menganggur
- [Docs/Contributor.md](Docs/Contributor.md) — cara ikut ngoding di sini
- [Docs/Changelog.md](Docs/Changelog.md) — riwayat perubahan
