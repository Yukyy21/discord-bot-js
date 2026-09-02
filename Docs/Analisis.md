# Analisis Bot (Dokumentasi)

Ringkasan hasil pembacaan seluruh isi repo — apa yang ada, bagaimana lapisannya
disusun, dan catatan teknis yang perlu diketahui sebelum menambah fitur.

## Identitas Singkat

Bot Discord ekonomi + leveling untuk server komunitas. Node.js (CommonJS),
`discord.js` v14, penyimpanan `better-sqlite3` (sinkron, satu file DB),
gambar kartu dengan `@napi-rs/canvas`. Tanpa framework tambahan, tanpa
TypeScript, tanpa build step: `npm start` menjalankan `src/index.js`.

## Arsitektur Lapis

```text
src/index.js            loader command + event, login client
 ├─ commands/<kategori>/ satu file = satu slash command (data + execute)
 ├─ events/              messageCreate, voiceStateUpdate, interactionCreate, ready
 ├─ database/            akses SQLite, dipublikasikan lewat database/index.js
 ├─ lib/                 aturan murni: leveling, quests, buffs, tiers, antispam
 ├─ cards/               render gambar profile/rank/leaderboard (canvas)
 ├─ ui/                  embed, pager, halaman /guide
 └─ config/              constants.js (angka ekonomi), index.js (role & emoji)
```

Empat kebiasaan yang konsisten dan sebaiknya diikuti fitur baru:

1. **Command auto-load.** `loadCommands()` memindai `commands/<kategori>/*.js`
   dan hanya mendaftarkan file yang punya `data` **dan** `execute`. Menambah
   command = menambah satu file; tidak ada daftar manual yang perlu diedit.
   Registrasi ke Discord tetap lewat `npm run deploy`.
2. **Satu pintu database.** Semua modul di `database/` di-spread ke
   `database/index.js`, jadi pemakai cukup `require('../../database')`.
   Skema dibuat idempoten (`IF NOT EXISTS` + `runMigrations()` untuk kolom baru).
3. **Angka terpisah dari logika.** Semua balancing ada di
   `config/constants.js`; emoji terpusat di `lib/emojis.js` dengan fallback
   unicode supaya ID emoji yang salah tidak pernah bikin error.
4. **UI terpusat.** Warna, embed, progress bar, dan pager selalu dari
   `ui/embeds.js` + `ui/pager.js`. State pagination disimpan di `customId`
   (`aksi:a:b`), jadi tombol tetap hidup setelah bot restart.

## Model Data

Semua tabel per-guild (guildId selalu bagian dari primary key): `users`
(balance, bank, lastDaily, streak), `points` (points, pendingWords, xp, level,
voice_seconds), `shop_items` + `user_items`, `quests`, `weekly_points`,
`user_buffs` (userId `*` = buff seluruh guild), dan `voice_sessions` sebagai
cermin sesi voice supaya waktu tidak hangus kalau proses mati.

Tiga nilai sengaja dipisah: **Poruv** (kontribusi, tidak bisa ditransfer,
dibelanjakan di `/poruv-shop`), **Coin** (belanja di `/shop`, bisa `/give`),
**XP** (menentukan level → tier rank).

## Titik Kuat

- Ketahanan runtime: handler `unhandledRejection`/`uncaughtException`,
  interaksi basi (>2,5 detik) dilewati, error 10062 diabaikan tanpa spam log.
- Anti-eksploitasi sudah dipikirkan: cooldown 3 detik, filter pesan duplikat,
  batas XP per pesan, voice butuh minimal 2 orang non-deaf dan bukan AFK.
- Dokumentasi internal rapi (`Docs/Bot.md`, `Emoji.md`, `ability.md`) dan
  komentar kode menjelaskan *alasan*, bukan cuma *apa*.

## Catatan / Risiko

- SQLite sinkron di proses yang sama: aman untuk skala komunitas, tapi query
  berat di command populer akan memblokir event loop.
- Stok shop dan cooldown antispam hidup di memori — restart = undian baru dan
  riwayat spam hilang (disengaja, bukan data ekonomi).
- Gerbang izin admin sepenuhnya mengandalkan `setDefaultMemberPermissions`
  di sisi Discord; tidak ada pemeriksaan izin kedua di dalam `execute`.

## Posisi Fitur AI Baru

Fitur `/ai-ask` mengikuti pola yang sama: satu file command di
`commands/general/`, aturan/rasa di `config/ai.js`, logika di `lib/`
(`ai.js` untuk provider, `aiContext.js` untuk baca `Docs/ai.md`), tampilan
lewat `ui/embeds.js`. AI **tidak** menyentuh database sama sekali — ia hanya
membaca dokumen pengetahuan, jadi tidak ada risiko kebocoran data user.
Detail konfigurasinya ada di `Docs/Bot.md` bagian "Fitur AI".

