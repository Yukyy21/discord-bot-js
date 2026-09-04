# Balancing Ekonomi (Coin, XP, Poin)

Dokumen kerja untuk gelombang balancing. Semua angka di bawah dihitung dari
kode yang ada sekarang (`src/config/constants.js`, `src/lib/ranks.js`,
`src/lib/quests.js`, `src/lib/bossCatalog.js`, `src/database/shopCatalog.js`).
Tujuannya satu: tahu dari mana nilai masuk, ke mana keluar, dan di mana
angkanya pecah.

## Tiga Mata Uang & Perannya

| Nilai | Sumber | Kegunaan | Bisa dipindah? |
| --- | --- | --- | --- |
| **Poin** | chat, voice, level up, boss, `/exchange` | leaderboard utama & mingguan | tidak |
| **Coin** | `/daily`, quest, level up, boss, `/admin give-coin` | `/shop`, `/exchange`, `/give` | ya (`/give`) |
| **XP** | chat, item, boss | level → tier rank | tidak |

Masalah struktural: **Coin bisa dipindah, Poin tidak — tapi Coin bisa berubah
jadi Poin lewat `/exchange` (500:1) tanpa batas dan tanpa pajak.** Artinya
leaderboard poin secara teknis bisa dibeli, dan bisa disuplai akun lain lewat
`/give`. Ini akar dari sebagian besar isu di bawah.

## Pemasukan Harian (user aktif, estimasi)

Asumsi: 100 pesan/hari @ ±10 kata, 2 jam voice, ikut 2 boss, klaim semua quest.

| Sumber | Poin/hari | XP/hari | Coin/hari |
| --- | --- | --- | --- |
| Chat (1.000 kata) | ±285 | ±1.000 | 0 |
| Voice (2 jam) | 40 | 0 | 0 |
| `/daily` (streak 30) | 0 | 0 | 3.400 |
| Quest harian (2) | 0 | 0 | ±700 |
| Quest mingguan+bulanan (dibagi rata) | 0 | 0 | ±800 |
| Level up (±1 level, lv 20) | 200 | 0 | 1.000 |
| Boss 2× (kalau masuk 4 besar) | 100–300 | 400–1.000 | **9.600–30.000** |

Kesimpulan angka:

1. **Boss menyumbang 80–90% coin yang masuk ke server**, dan hanya ke maksimal
   4 orang per spawn. Yang tidak masuk top 3/last hit dapat **nol**, padahal
   ikut memukul.
2. **Voice dibayar terlalu murah**: 1 jam voice = 20 poin ≈ 70 kata chat.
   Voice juga sama sekali tidak memberi XP, jadi member voice-only tidak
   pernah naik level.
3. **Coin tidak punya sink permanen.** Keluar hanya lewat `/shop` dan
   `/exchange`; `/bank` netral (tanpa bunga, tanpa biaya). Ekonomi otomatis
   inflasi setiap hari.
4. **Streak `/daily` tanpa batas**: +100/hari selamanya. Hari ke-100 =
   10.400 coin sehari untuk satu perintah.

## Harga Item vs Manfaatnya

Item multiplier dihitung dari nilai yang benar-benar bisa didapat selama buff
aktif:

- **Multiplier coin** (Rusty Shortsword s/d Dragon Scale, 1.200–10.000 coin):
  coin *tidak pernah* masuk dari chat/voice. Buff coin hanya kena saat klaim
  `/daily`, klaim quest, level up, dan hadiah boss. Jadi item ini bukan buff
  gaya main, tapi **alat timing**: pakai tepat sebelum klaim. Dragon Scale
  (10.000, ×1.25) yang dipakai sebelum quest bulanan 15.000 langsung balik
  modal +3.750, dan sebelum hadiah boss 30.000 jadi +7.500.
- **Multiplier XP** (Plasma Blaster, kini 4.500, ×1.3, 60 menit): batas 20 XP per
  pesan bikin plafon ±«200 XP/menit chat»; 4.500 coin lebih dekat ke nilai sebenarnya.
- **Multiplier poin** (Crystal Dagger, kini 3.500, ×1.2, 60 menit): setara
  ±60 poin tambahan; 3.500 coin jauh lebih masuk akal dari 15.000 lama.
- **Ability boss** (Epic–Mythic): ini satu-satunya kelompok yang harganya masuk
  akal, karena hadiah boss memang besar.

## Titik Pecah yang Sudah Terkonfirmasi

- **Item acak saat level up tidak ditimbang rarity.** `messageCreate.js`
  mengambil `items[Math.floor(Math.random() * items.length)]` dari **seluruh**
  katalog, jadi Mythic 100.000-an coin punya peluang sama dengan Slime Gel,
  dengan peluang drop sampai 50% per level. Ini jalur item gratis terbesar di
  bot dan melewati `weightedRandom()` yang sudah ada di `src/lib/tiers.js`.
- **Buff diterapkan saat klaim, bukan saat quest selesai.** Pemain bisa
  menunda klaim, pasang buff coin, baru klaim.
- **Solo farm boss.** Pump Freakin 24.000 HP, damage rata-rata 500, cooldown
  **10 detik**, despawn 6 jam → satu orang bisa memukul sangat banyak sendirian
  dan memborong jatah top 1 + last hit (60% hadiah) tanpa saingan. Rem barunya
  bukan cooldown melainkan **serangan balik boss** (cooldown ×2–×3, damage
  ×0.65–×0.7, serangan meleset, dan rampasan coin), yang makin sering kena
  justru pada pemukul paling rajin karena amukan menyasar penyerang teraktif.
- **Jam spawn 00:00 dan 12:00 WIB.** Slot tengah malam nyaris tidak ada yang
  ikut, jadi boss kabur atau dipanen satu orang.
- **`/give` makan biaya 5%** (dibakar, sink coin berjalan). **Sudah ada limit
  harian** (`GIVE.DAILY_LIMIT_COUNT = 5` transfer dan `GIVE.DAILY_LIMIT_COIN =
  50.000` nominal/hari, reset tiap hari waktu lokal, lihat `give_daily`) — tapi
  tanpa minimum umur akun, dan topik `/exchange` tanpa batas sudah tidak relevan
  karena `/exchange` dihapus. Perlu dicermati apakah limit harian cukup menutup
  santet alt.

## Target Angka yang Disarankan

Bukan keputusan final — ini titik awal untuk dicoba di server:

- Voice: 5 poin/15 menit → **8 poin/15 menit**, plus **XP voice** (mis. 10 XP
  per interval) supaya voice-only tetap naik level.
- Daily: bonus streak dibatasi (`STREAK_MAX_BONUS`, mis. 3.000 = 30 hari).
- Boss: hadiah dibagi **proporsional damage untuk semua peserta** (mis. 60%
  pool), sisanya baru bonus top 3 + last hit; tambah `MIN_PARTICIPANTS` supaya
  solo farm tidak penuh; pertimbangkan jam spawn 12:00 & 20:00 WIB.
- Boss coin pool: turunkan ke kisaran 8.000 / 10.000 / 25.000 supaya boss tidak
  lagi jadi sumber tunggal coin.
- Level up: `level × 50` coin diberi plafon (mis. maksimum 2.500) dan item acak
  diundi lewat `weightedRandom()` dengan bobot tier, bukan uniform.
- Sink baru: **biaya `/give` 5% sudah jalan** (`GIVE_FEE_RATE`, dibakar dari saldo
  pengirim). Kandidat berikutnya: biaya administrasi `/bank withdraw` (mis.
  1–2%), atau harga shop yang naik saat inflasi.
- `/exchange`: naikkan kurs (mis. 1.000 coin = 1 poin) atau beri jatah harian,
  supaya leaderboard tetap soal aktivitas.
- Buff: kunci multiplier pada saat quest **selesai**, bukan saat diklaim.
