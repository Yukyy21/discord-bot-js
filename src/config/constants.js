// Angka-angka yang menentukan "rasa" ekonomi bot. Semua ada di sini biar
// balancing bisa diubah tanpa mengubek-ubek logika command dan event.

/** Poin & XP dari aktivitas chat. */
const CHAT = {
  WORDS_PER_POINT: 7, // tiap 7 kata (sisa kata disimpan, tidak hangus)
  POINTS_PER_CHUNK: 2,
  XP_PER_WORD: 1,
  MAX_XP_PER_MESSAGE: 20, // batas biar spam pesan panjang tidak dieksploitasi
  ANTISPAM_COOLDOWN_MS: 3000, // jarak minimum antar pesan yang dihitung
  DUPLICATE_WINDOW_MS: 30000, // pesan dengan isi sama persis diabaikan selama window ini
};

/** Poin & XP dari nongkrong di voice channel. */
const VOICE = {
  INTERVAL_MS: 15 * 60 * 1000,
  POINTS_PER_INTERVAL: 8,
  XP_PER_INTERVAL: 10,
  // Minimal manusia yang tidak deaf di satu channel (termasuk yang bersangkutan)
  // supaya waktu voice layak poin. Sendirian, semua teman deaf, atau duduk di
  // AFK channel tidak menghasilkan poin.
  MIN_LISTENERS: 2,
};

/** Reward /daily. Bonus naik tiap hari selama streak tidak putus, dibatasi. */
const DAILY = {
  BASE_REWARD: 500,
  STREAK_BONUS: 100,
  STREAK_MAX_BONUS: 3000, // maks bonus streak = 30 hari × 100
  DAY_MS: 24 * 60 * 60 * 1000,
};

/** Kurs /exchange: 1000 coin = 1 poin. */
const EXCHANGE_RATE = 1000;

/** Stok /shop diacak ulang tiap 10 menit. */
const SHOP = {
  REFRESH_INTERVAL_MS: 10 * 60 * 1000,
  STOCK_SIZE: 10,
};

/** Quest harian, mingguan & bulanan. Jumlah yang ditugaskan per periode per user. */
const QUEST = {
  DAILY_COUNT: 2,
  WEEKLY_COUNT: 1,
  MONTHLY_COUNT: 1,
};

/**
 * Mini boss. Boss spawn otomatis di jam 12 dan 20 waktu lokal event
 * (BOSS_UTC_OFFSET, default WIB) di channel BOSS_CHANNEL_ID.
 * Player tidak punya HP — yang berdarah hanya boss.
 */
const BOSS = {
  SPAWN_HOURS: [12, 20],
  UTC_OFFSET: Number(process.env.BOSS_UTC_OFFSET ?? 7), // 7 = WIB
  CHECK_INTERVAL_MS: 60 * 1000, // penjaga jadwal & despawn
  ATTACK_COOLDOWN_MS: 10 * 1000, // jeda tombol serang per user (dikali debuff `debuff:cooldown`)
  DESPAWN_MS: 6 * 60 * 60 * 1000, // boss kabur kalau tidak dikalahkan
  MIN_PARTICIPANTS: 3, // minimal peserta sebelum boss bisa dikalahkan
  // Jatah hadiah: 60% pool dibagi proporsional damage ke semua peserta,
  // sisanya bonus top 3 damager + last hit.
  PROPORTIONAL_SHARE: 0.6,
  TOP_ROLES: ['top1', 'top2', 'top3'],
  TOP_SHARES: [0.15, 0.1, 0.05],
  LAST_HIT_SHARE: 0.1,
  // Serangan balik boss. Boss tidak bisa membunuh player (player tetap tanpa
  // HP) — yang dilakukannya adalah memasang debuff atau merampas coin.
  RAMPAGE_INTERVAL_MS: 5 * 60 * 1000, // boss mengamuk berkala ke penyerang aktif
  RAMPAGE_TARGETS: 3, // maksimal player yang kena satu amukan
  RAMPAGE_WINDOW_MS: 15 * 60 * 1000, // hanya penyerang dalam window ini yang jadi sasaran
};

/** XP yang dibutuhkan untuk naik dari level tertentu. */
function xpForLevel(level) {
  return level * 100;
}

module.exports = { CHAT, VOICE, DAILY, EXCHANGE_RATE, SHOP, QUEST, BOSS, xpForLevel };

