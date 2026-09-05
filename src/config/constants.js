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
  XP_CAP_PER_MINUTE: 200, // plafon XP chat per menit — spam <3 detik (20 pesan × 20 XP)
  // bisa sampai ~400 XP/menit; member normal jarang lewat separuhnya. Jendela
  // bergulir, jadi yang habis duluan kena plafon sampai jendelanya lewat.
  XP_CAP_WINDOW_MS: 60 * 1000,
};

/** Poin & XP dari nongkrong di voice channel. */
const VOICE = {
  INTERVAL_MS: 15 * 60 * 1000,
  INTERVAL_MINUTES: (15 * 60 * 1000) / 60000, // setara menit satu interval voice
  POINTS_PER_INTERVAL: 8,
  XP_PER_INTERVAL: 10,
  // Minimal manusia yang tidak deaf di satu channel (termasuk yang bersangkutan)
  // supaya waktu voice layak poin. Sendirian, semua teman deaf, atau duduk di
  // AFK channel tidak menghasilkan poin.
  MIN_LISTENERS: 2,
  // Batas chunk yang dibayar sekaligus dalam satu tick (mis. setelah bot down
  // lama). 4 chunk = cap 1 jam, supaya downtime panjang tidak jadi insentif.
  MAX_CHUNKS_PER_GRANT: 4,
};

/** Reward /daily. Bonus naik tiap hari selama streak tidak putus, dibatasi. */
const DAILY = {
  BASE_REWARD: 500,
  STREAK_BONUS: 100,
  STREAK_MAX_BONUS: 3000, // maks bonus streak = 30 hari × 100
  DAY_MS: 24 * 60 * 60 * 1000,
};

/** Kurs Poruv Shop dihapus — Poruv sekarang dipakai langsung lewat /poruv-shop. */

/** Jumlah item yang bisa di-equip sekaligus per user (/equip). */
const EQUIP_SLOTS = 5;

/**
 * Batasan /give. Dua hal yang dibatasi per hari per user (reset tengah malam
 * waktu lokal event, lihat lib/boss localDateKey):
 *  - DAILY_LIMIT_COUNT: berapa kali /give sukses dalam sehari.
 *  - DAILY_LIMIT_COIN : total nominal coin yang boleh keluar (tanpa fee) sehari.
 * Ini menutup santet alt — coin tidak bisa dijejalkan ke satu akun tanpa batas.
 */
const GIVE = {
  FEE_RATE: 0.05, // 5%
  DAILY_LIMIT_COUNT: 5,
  DAILY_LIMIT_COIN: 50000,
};

// Nama lama dipertahankan untuk kompatibilitas pemanggil/test yang sudah ada.
const GIVE_FEE_RATE = GIVE.FEE_RATE;

/** Stok /shop diacak ulang tiap 10 menit. */
const SHOP = {
  REFRESH_INTERVAL_MS: 10 * 60 * 1000,
  STOCK_SIZE: 10,
};

/**
 * Katalog /poruv-shop. Harga ditentukan langsung oleh owner (bukan hasil
 * proyeksi income otomatis lagi):
 *  - Item Mythic (Acak)   : 2.500 Poruv
 *  - Owocash 1.000.000    : 5.000 Poruv
 *  - Custom Role          : 10.000 Poruv
 *  - E-Wallet 25.000      : 15.000 Poruv
 * `fulfillment: 'manual'` artinya redeem masuk antrean dan admin di-DM
 * (lihat notifyAdmins di poruvShop.js command) — bot tidak menyerahkan
 * barangnya sendiri, kecuali item Mythic yang otomatis lewat /inventory.
 */
const PORUV_SHOP = [
  {
    key: 'mythic_item',
    name: 'Item Mythic (Acak)',
    emoji: 'inventory',
    price: 2500,
    fulfillment: 'manual',
    description: 'Satu item Mythic acak dari katalog /shop (Starbreaker Claymore, Genesis Scepter, dst).',
  },
  {
    key: 'owocash_1m',
    name: 'Owocash 1.000.000',
    emoji: 'owocash',
    price: 5000,
    fulfillment: 'manual',
    description: 'Transfer 1.000.000 Owocash (OwO bot), diproses admin manual.',
  },
  {
    key: 'custom_role',
    name: 'Custom Role',
    emoji: 'role',
    price: 10000,
    fulfillment: 'manual',
    description: 'Role custom (nama & warna sesuai request), dibuatkan admin manual.',
  },
  {
    key: 'ewallet_25k',
    name: 'E-Wallet 25.000',
    emoji: 'wallet',
    price: 15000,
    fulfillment: 'manual',
    description: 'Saldo e-wallet Rp25.000, dikirim admin setelah verifikasi.',
  },
];

/** Quest harian, mingguan & bulanan. Jumlah yang ditugaskan per periode per user. */
const QUEST = {
  DAILY_COUNT: 2,
  WEEKLY_COUNT: 1,
  MONTHLY_COUNT: 1,
};

/**
 * Mini boss. Boss spawn otomatis di jam 00:00 dan 12:00 waktu lokal event
 * (BOSS_UTC_OFFSET, default WIB) di channel BOSS_CHANNEL_ID.
 * Player tidak punya HP — yang berdarah hanya boss.
 */
const BOSS = {
  SPAWN_HOURS: [0, 12],
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

const STATUS = {
  // Jeda antar pergantian status, acak di rentang ini biar tidak monoton.
  MIN_INTERVAL_MS: 5 * 1000,
  MAX_INTERVAL_MS: 10 * 1000,
  SERVER_INVITE: 'https://discord.gg/ruv',
};

module.exports = {
  CHAT,
  VOICE,
  DAILY,
  SHOP,
  PORUV_SHOP,
  QUEST,
  BOSS,
  GIVE,
  GIVE_FEE_RATE,
  EQUIP_SLOTS,
  STATUS,
  xpForLevel,
};
