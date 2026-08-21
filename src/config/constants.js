// Angka-angka yang menentukan "rasa" ekonomi bot. Semua ada di sini biar
// balancing bisa diubah tanpa mengubek-ubek logika command dan event.

/** Poin & XP dari aktivitas chat. */
const CHAT = {
  WORDS_PER_POINT: 7, // tiap 7 kata (sisa kata disimpan, tidak hangus)
  POINTS_PER_CHUNK: 2,
  XP_PER_WORD: 1,
  MAX_XP_PER_MESSAGE: 20, // batas biar spam pesan panjang tidak dieksploitasi
  // Anti-spam: pesan yang datang lebih cepat dari ini diabaikan, begitu juga
  // isi yang sama berulang dalam jendela duplikat. Tidak dapat poin, XP, kata.
  COOLDOWN_MS: 3 * 1000,
  DUPLICATE_WINDOW_MS: 5 * 60 * 1000,
};

/** Poin dari nongkrong di voice channel. */
const VOICE = {
  INTERVAL_MS: 15 * 60 * 1000,
  POINTS_PER_INTERVAL: 5,
  // Minimal manusia yang tidak deaf di satu channel (termasuk yang bersangkutan)
  // supaya waktu voice layak poin. Sendirian, semua teman deaf, atau duduk di
  // AFK channel tidak menghasilkan poin.
  MIN_LISTENERS: 2,
};

/** Reward /daily. Bonus naik tiap hari selama streak tidak putus. */
const DAILY = {
  BASE_REWARD: 500,
  STREAK_BONUS: 100,
  DAY_MS: 24 * 60 * 60 * 1000,
};

/** Kurs /exchange: 500 coin = 1 poin. */
const EXCHANGE_RATE = 500;

/** Stok /shop diacak ulang tiap 10 menit. */
const SHOP = {
  REFRESH_INTERVAL_MS: 10 * 60 * 1000,
  STOCK_SIZE: 10,
};

/** XP yang dibutuhkan untuk naik dari level tertentu. */
function xpForLevel(level) {
  return level * 100;
}

module.exports = { CHAT, VOICE, DAILY, EXCHANGE_RATE, SHOP, xpForLevel };
