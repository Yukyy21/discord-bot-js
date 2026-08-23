// Katalog dasar item shop. Harga & deskripsi hidup di database setelah seed,
// tapi kolom `effect` selalu disinkronkan dari file ini (lihat syncEffects()).
//
// Format: [id, nama, harga, deskripsi, efek]. Harga menentukan tier di lib/shopRotation.js.
//
// Bentuk efek yang dikenal:
//   { type: 'mult', stat: 'coin' | ['xp','points'], value, durationMs }
//   { type: 'ability', key, name, value?, durationMs?, charges? }
//   { type: 'xp' | 'points', value }   // efek instan lama, tetap didukung
//
// Multiplier coin sengaja tidak pernah menyentuh /give dan /exchange supaya
// item tidak berubah jadi mesin cetak uang.
const { ABILITIES: ABILITY_KEYS } = require('../lib/abilities');

const MINUTE = 60 * 1000;

const SHOP_CATALOG = [
  [1, 'Rusty Shortsword', 1200, 'Pedang pendek peninggalan prajurit yang sudah berkarat', { type: 'mult', stat: 'coin', value: 1.05, durationMs: 30 * MINUTE }],
  [2, 'Apprentice Wand', 1500, 'Tongkat sihir kayu biasa yang sering dipakai pemula', { type: 'mult', stat: 'xp', value: 1.05, durationMs: 30 * MINUTE }],
  [3, 'Iron Ore', 800, 'Bijih besi mentah yang belum diolah', { type: 'mult', stat: 'coin', value: 1.08, durationMs: 20 * MINUTE }],
  [4, 'Slime Gel', 600, 'Lendir lengket yang dijatuhkan oleh monster tingkat rendah', { type: 'mult', stat: 'xp', value: 1.1, durationMs: 30 * MINUTE }],
  [5, 'Tattered Parchment', 500, 'Gulungan kertas usang yang tulisannya sudah hampir pudar', { type: 'mult', stat: 'points', value: 1.05, durationMs: 30 * MINUTE }],
  [6, 'Steel Broadsword', 6500, 'Pedang baja kokoh dengan daya tebas yang mantap', { type: 'mult', stat: 'coin', value: 1.12, durationMs: 45 * MINUTE }],
  [7, "Ranger's Bow", 5500, 'Busur andalan para pemburu untuk menyerang dari jauh', { type: 'mult', stat: 'points', value: 1.1, durationMs: 45 * MINUTE }],
  [8, 'Silver Ingot', 4000, 'Batangan perak murni yang sudah dilebur sempurna', { type: 'mult', stat: 'coin', value: 1.15, durationMs: 30 * MINUTE }],
  [9, 'Glowing Mushroom', 3500, 'Jamur beracun yang memancarkan cahaya di tempat gelap', { type: 'mult', stat: 'xp', value: 1.15, durationMs: 45 * MINUTE }],
  [10, 'Beast Fang', 3000, 'Taring tajam utuh dari monster buas di hutan', { type: 'mult', stat: 'points', value: 1.12, durationMs: 45 * MINUTE }],
  [11, 'Plasma Blaster', 18000, 'Senjata api berenergi plasma dengan akurasi tinggi', { type: 'mult', stat: 'xp', value: 1.25, durationMs: 60 * MINUTE }],
  [12, 'Crystal Dagger', 15000, 'Belati tajam yang terbuat dari pecahan kristal es abadi', { type: 'mult', stat: 'points', value: 1.2, durationMs: 60 * MINUTE }],
  [13, 'Stardust Core', 12000, 'Inti energi murni yang jatuh dari bongkahan bintang', { type: 'mult', stat: ['xp', 'points'], value: 1.15, durationMs: 60 * MINUTE }],
  [14, 'Dragon Scale', 10000, 'Sisik naga pelindung yang sangat keras dan tahan api', { type: 'mult', stat: 'coin', value: 1.25, durationMs: 60 * MINUTE }],
  [15, 'Quantum Chip', 8500, 'Komponen cybernetic canggih peninggalan teknologi masa lalu', { type: 'mult', stat: ['coin', 'xp', 'points'], value: 1.1, durationMs: 90 * MINUTE }],
  [16, 'Blade of Desolation', 48000, 'Pedang besar yang memancarkan aura kegelapan dan keputusasaan', { type: 'ability', key: 'boss_damage', name: 'Sharpened Edge', value: 1.3, durationMs: 30 * MINUTE }],
  [17, 'Void Scepter', 42000, 'Tongkat penyihir yang mampu memanipulasi gravitasi di sekitarnya', { type: 'ability', key: 'boss_loot_rate', name: 'Void Grip', value: 2, durationMs: 30 * MINUTE }],
  [18, 'Meteorite Alloy', 35000, 'Logam super kuat hasil tempaan batu meteor dari luar angkasa', { type: 'ability', key: 'boss_drop_amount', name: 'Heavy Impact', value: 2, charges: 1 }],
  [19, 'Abyssal Eye', 28000, 'Mata monster raksasa yang diambil dari dasar jurang terdalam', { type: 'ability', key: 'quest', name: 'Insight', value: 2, durationMs: 60 * MINUTE }],
  [20, 'Tears of the Fallen', 22000, 'Kristal ajaib yang terbentuk dari air mata dewa yang gugur', { type: 'ability', key: 'daily_reset', name: 'Second Wind' }],
  [21, 'Blade of the Fallen King', 55000, 'Pedang peninggalan raja lalim yang ditakuti, masih memancarkan aura intimidasi', { type: 'ability', key: 'boss_damage', name: 'Kingslayer', value: 1.6, durationMs: 30 * MINUTE }],
  [22, 'Phoenix Whisper Bow', 50000, 'Busur yang terbuat dari bulu burung Phoenix, anak panahnya meledak menjadi api abadi', { type: 'ability', key: 'extend_buffs', name: 'Rekindle', durationMs: 30 * MINUTE }],
  [23, 'Adamantine Ingot', 45000, 'Balok logam terkeras di dunia yang tidak bisa dilebur dengan api biasa', { type: 'ability', key: 'no_consume', name: 'Sturdy', charges: 3 }],
  [24, "Leviathan's Scale", 42000, 'Sisik raksasa dari monster penguasa lautan terdalam, kebal terhadap segala sihir elemen air', { type: 'ability', key: 'quest_coin', name: 'Deep Current', value: 2, durationMs: 30 * MINUTE }],
  [25, 'Holy Grail Fragment', 38000, 'Pecahan cawan suci yang memancarkan cahaya kehidupan, sering dicari untuk ritual penyembuhan absolut', { type: 'ability', key: 'xp_fill', name: 'Blessing' }],
  [26, 'Starbreaker Claymore', 120000, 'Pedang raksasa bersinar yang menyerap energi rasi bintang; konon tebasannya mampu membelah planet', { type: 'ability', key: 'boss_damage', name: 'Star Cleave', value: 2, durationMs: 30 * MINUTE }],
  [27, 'Genesis Scepter', 110000, 'Tongkat penciptaan yang memegang rahasia awal mula alam semesta, mampu memanipulasi gravitasi', { type: 'ability', key: 'all_mult', name: 'Genesis', value: 1.5, durationMs: 60 * MINUTE }],
  [28, 'Astral Fragment', 90000, 'Pecahan murni dari dimensi bintang-bintang yang menjadi fondasi pembentuk realitas dan ruang angkasa', { type: 'ability', key: 'server_xp', name: 'Astral Rift', value: 1.25, durationMs: 15 * MINUTE }],
  [29, 'Heart of the Primordial', 80000, 'Jantung dari entitas pertama di alam semesta yang masih berdetak, menghasilkan energi tanpa batas', { type: 'ability', key: 'duration', name: 'Endless Pulse', value: 1.25, durationMs: 180 * MINUTE }],
  [30, 'Chrono Core', 70000, 'Inti mesin waktu kuno yang melayang dan terus berputar, mampu memperlambat waktu di sekitarnya', { type: 'ability', key: 'cooldown_reset', name: 'Time Skip' }],
];

const STAT_META = {
  coin: { emoji: 'coin', label: 'Coin' },
  xp: { emoji: 'xp', label: 'XP' },
  points: { emoji: 'point', label: 'Poin' },
};

const statList = stat => (Array.isArray(stat) ? stat : [stat]).filter(s => STAT_META[s]);

const minutes = ms => `${Math.round(ms / 60000)} menit`;

// Jenis efek yang dikenal bot. Efek di luar daftar ini dianggap tidak bisa
// dipakai, jadi data lama atau rusak di database tidak bikin crash.
const EFFECTS = {
  xp: {
    valid: e => typeof e.value === 'number',
    describe: e => ({ text: `+${e.value} XP`, emoji: 'xp' }),
  },
  points: {
    valid: e => typeof e.value === 'number',
    describe: e => ({ text: `+${e.value} poin`, emoji: 'point' }),
  },
  mult: {
    valid: e => statList(e.stat).length > 0 && typeof e.value === 'number',
    describe: e => ({
      text: `${statList(e.stat).map(s => STAT_META[s].label).join(', ')} ×${e.value} · ${minutes(e.durationMs)}`,
      emoji: STAT_META[statList(e.stat)[0]].emoji,
    }),
  },
  ability: {
    valid: e => Boolean(ABILITY_KEYS[e.key]),
    describe: e => ({ text: `Ability: ${e.name}`, emoji: 'ability' }),
  },
};

/** Ubah isi kolom `effect` (string JSON) jadi objek; null kalau kosong/tidak valid. */
function parseEffect(raw) {
  if (!raw) return null;
  try {
    const effect = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const meta = EFFECTS[effect?.type];
    return meta && meta.valid(effect) ? effect : null;
  } catch {
    return null;
  }
}

/** Teks + emoji siap tampil untuk satu efek. Null kalau bukan item pakai. */
function describeEffect(effect) {
  const meta = effect && EFFECTS[effect.type];
  return meta && meta.valid(effect) ? meta.describe(effect) : null;
}

module.exports = { SHOP_CATALOG, STAT_META, statList, parseEffect, describeEffect };
