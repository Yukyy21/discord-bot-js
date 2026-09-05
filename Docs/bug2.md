# Bug2 — Temuan Audit Pasca-Merge

Daftar bug hasil audit lanjutan (3 subagen + verifikasi manual) di branch
`neko-path2`/`ferr-path2`, commit `590f15e` (Gelombang Empat Belas).
Diurutkan dari yang paling mengganggu.

**Status: Critical (#1) dan Major (#2, #4) sudah diperbaiki dan diverifikasi
— lihat [What I do.md](What%20I%20do.md). #3, #5, dan #6 sudah diperbaiki.
Minor (#7-#9) masih belum dikerjakan.**

## Critical

## 1. ~~Fitur amukan boss MATI total~~ ✅ DIPERBAIKI

- `src/database/boss.js:66` — `getContributions` SELECT hanya `userId, damage,
  hits`, **tidak menyertakan `lastAttackAt`**.
- `src/lib/boss.js:9` — `pickRampageTargets` memfilter `c.lastAttackAt && ...`
  → selalu falsy → selalu `[]`.
- `src/lib/bossManager.js:249-250` — `rampageBoss` selalu `return []` di baris 250.

**Dampak:** boss tidak pernah mengamuk/menyerang balik (kasih `debuff`,
`debuff:cooldown`, atau rampas coin). Penjadwal mencoba setiap menit sebagai
no-op (buang-buang DB read per boss aktif per menit — `startBossScheduler`
melakukan query `getContributions` tiap tick tanpa hasil).

**Kenapa tes hijau:** `test/bossAttacks.test.js:93-97` mengoper `lastAttackAt`
secara eksplisit, jadi `pickRampageTargets` teruji terisolasi — tapi sumber data
produksinya (`getContributions`) tidak pernah menyediakan field itu.

**Perbaikan (diterapkan):** tambah `lastAttackAt` ke SELECT `getContributions`.
Diverifikasi manual: `pickRampageTargets` sekarang mengembalikan target yang
benar (bukan `[]`) saat diberi data dari `getContributions` yang sudah diperbaiki.

## Major

## 2. ~~`resetUser` menghapus `boss_damage` lintas semua guild~~ ✅ DIPERBAIKI

- `src/database/admin.js:29` — `DELETE FROM boss_damage WHERE userId = ?` tanpa
  filter guild.
- Tabel `boss_damage` **tidak punya kolom `guildId`** (PK `bossId + userId`,
  `schema.js:111-118`).

**Dampak:** admin reset user di guild A juga menghapus riwayat damage boss user
itu di guild B/C/D (kehilangan data lintas server).

**Perbaikan (diterapkan):**
`DELETE FROM boss_damage WHERE userId = ? AND bossId IN (SELECT id FROM boss_spawns WHERE guildId = ?)`.
Diverifikasi lewat eksekusi SQL nyata (Python `sqlite3`): damage di guild yang
direset terhapus, damage di guild lain tetap utuh. Komentar kode yang salah
nalar ("userId unik lintas guild, jadi aman") juga diperbaiki. Test
`test/adminReset.test.js` diupdate — sebelumnya test itu justru menguji dan
mengharapkan behaviour lama (bug-nya), sekarang menguji behaviour yang benar
(termasuk assertion baru yang memverifikasi damage guild lain tidak ikut hilang).

## 3. ~~`finishBoss` tidak idempoten (potensi reward dobel)~~ ✅ DIPERBAIKI

- `src/lib/bossManager.js:278-299` — tidak ada guard sebelum `distributeRewards`.

**Aman sekarang** karena `applyDamage` sinkron dalam satu transaksi (event loop
satu thread; hanya satu penyerang yang melihat `defeated:true`). Tapi kalau nanti
ada refactor async atau command "force-finish", reward bisa dibagikan 2×.

**Perbaikan:** `if (getBossById(row.id)?.status !== 'defeated') return [];` di awal
`finishBoss`.

## 4. ~~Killing-blow hilang jika interaksi expire~~ ✅ DIPERBAIKI

- `src/lib/bossManager.js:199` — damage sudah di-commit ke DB, lalu
  `await interaction.deferUpdate()`.
- Kalau interaksi kedaluwarsa (3 detik) sebelum `deferUpdate` → lanjutan di-skip;
  **`finishBoss` tidak terpanggil**.

**Dampak:** boss yang seharusnya mati tertinggal `status='defeated'` (HP 0) tanpa
reward dibagikan, tombol stale, dan tidak ada recovery (penjadwal hanya memproses
boss `active`).

**Perbaikan (diterapkan):** `deferUpdate()`, `queueMessageEdit()`, dan
`followUp()` dibungkus try/catch tersendiri; `finishBoss(interaction.client, after)`
dipanggil di luar blok itu, tanpa syarat sukses-nya langkah UI di atas — hanya
bergantung pada `result.defeated` yang sudah ditentukan oleh `applyDamage()`
yang ter-commit sebelum semua interaksi Discord. Diverifikasi lewat simulasi:
`finishBoss` tetap terpanggil baik saat interaksi normal maupun saat
`deferUpdate()` sengaja dibuat gagal (expired).

## Minor

## 5. ~~`/use` null-deref `describeEffect`~~ ✅ DIPERBAIKI

- `src/commands/economy/use.js:40` — `themedEmbed(info.emoji, ...)` tanpa guard;
  `describeEffect` bisa return `null` (`src/database/shopCatalog.js:284-285`).

**Aman hari ini** (katalog valid), tapi rapuh — perubahan katalog di masa depan
bisa memicu crash.

**Perbaikan:** `if (!info) return error reply;` sebelum `info.emoji`.

## 6. ~~Voice chunks tak di-cap~~ ✅ DIPERBAIKI

- `src/events/voiceStateUpdate.js:186-205` — `chunks` tanpa batas atas setelah
  restart.

**Dampak:** downtime 24 jam → 96 chunk = 768 poin + 960 XP sekaligus (untung
besar menahan outage of the bot).

**Perbaikan:** konstanta `MAX_CHUNKS` (misal 4 = cap 1 jam).

## 7. Bar XP NaN di level 0

- `src/cards/profileCard.js:66` & `src/cards/rankCard.js:53` — `xp / xpNeeded`;
  `xpForLevel(0) = 0` (`src/config/constants.js:145`) → `0/0 = NaN`.

Dijangkau via `/admin set-level 0`. Ada guard `if (pct > 0)` jadi **tidak crash**,
cuma tampil `0/0 XP` / bar kosong (kosmetik).

**Perbaikan:** guard `xpNeeded <= 0`.

## 8. `undefined` sebagai parameter SQL

- `src/database/quests.js:105` — `update.run(next, undefined, ...)`.

Lolos hari ini (better-sqlite3 mengkoersi `undefined → null`), tapi `undefined`
bukan tipe parameter terdokumentasi → bisa error saat upgrade library.

**Perbaikan:** pakai `null` sebagai ganti `undefined`.

## 9. `escapeBoss` meninggalkan tombol stale

- `src/lib/bossManager.js:328-336` — `resolveBossChannel` null → return awal
  sebelum disable tombol.

Boss sudah `escaped`, tapi tombol serang di pesan lama masih tampil aktif (klik →
"boss sudah selesai"). Ketidakkonsistenan UI saja, tidak merusak data.
