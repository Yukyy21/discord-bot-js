// Katalog dasar item shop. Dipakai sekali saat tabel `shop_items` masih kosong;
// setelah itu data hidup di database, jadi mengubah harga di sini tidak otomatis
// mengubah harga yang sudah tersimpan.
//
// Format: [id, nama, harga, deskripsi, efek]. Harga menentukan tier di lib/shopRotation.js.
// Efek (boleh null) bikin item bisa dipakai lewat /use; null = item koleksi.
// Sengaja tidak ada efek "coin" dengan nilai di atas harga — pembelian lalu
// pemakaian berulang akan jadi mesin cetak uang.
const SHOP_CATALOG = [
  [1, 'Rusty Shortsword', 1200, 'Pedang pendek peninggalan prajurit yang sudah berkarat', null],
  [2, 'Apprentice Wand', 1500, 'Tongkat sihir kayu biasa yang sering dipakai pemula', null],
  [3, 'Iron Ore', 800, 'Bijih besi mentah yang belum diolah', null],
  [4, 'Slime Gel', 600, 'Lendir lengket yang dijatuhkan oleh monster tingkat rendah', { type: 'xp', value: 30 }],
  [5, 'Tattered Parchment', 500, 'Gulungan kertas usang yang tulisannya sudah hampir pudar', { type: 'points', value: 2 }],
  [6, 'Steel Broadsword', 6500, 'Pedang baja kokoh dengan daya tebas yang mantap', null],
  [7, "Ranger's Bow", 5500, 'Busur andalan para pemburu untuk menyerang dari jauh', null],
  [8, 'Silver Ingot', 4000, 'Batangan perak murni yang sudah dilebur sempurna', null],
  [9, 'Glowing Mushroom', 3500, 'Jamur beracun yang memancarkan cahaya di tempat gelap', { type: 'xp', value: 60 }],
  [10, 'Beast Fang', 3000, 'Taring tajam utuh dari monster buas di hutan', { type: 'points', value: 5 }],
  [11, 'Plasma Blaster', 18000, 'Senjata api berenergi plasma dengan akurasi tinggi', null],
  [12, 'Crystal Dagger', 15000, 'Belati tajam yang terbuat dari pecahan kristal es abadi', null],
  [13, 'Stardust Core', 12000, 'Inti energi murni yang jatuh dari bongkahan bintang', { type: 'points', value: 15 }],
  [14, 'Dragon Scale', 10000, 'Sisik naga pelindung yang sangat keras dan tahan api', null],
  [15, 'Quantum Chip', 8500, 'Komponen cybernetic canggih peninggalan teknologi masa lalu', null],
  [16, 'Blade of Desolation', 48000, 'Pedang besar yang memancarkan aura kegelapan dan keputusasaan', null],
  [17, 'Void Scepter', 42000, 'Tongkat penyihir yang mampu memanipulasi gravitasi di sekitarnya', null],
  [18, 'Meteorite Alloy', 35000, 'Logam super kuat hasil tempaan batu meteor dari luar angkasa', null],
  [19, 'Abyssal Eye', 28000, 'Mata monster raksasa yang diambil dari dasar jurang terdalam', null],
  [20, 'Tears of the Fallen', 22000, 'Kristal ajaib yang terbentuk dari air mata dewa yang gugur', { type: 'points', value: 40 }],
  [21, 'Blade of the Fallen King', 55000, 'Pedang peninggalan raja lalim yang ditakuti, masih memancarkan aura intimidasi', null],
  [22, 'Phoenix Whisper Bow', 50000, 'Busur yang terbuat dari bulu burung Phoenix, anak panahnya meledak menjadi api abadi', null],
  [23, 'Adamantine Ingot', 45000, 'Balok logam terkeras di dunia yang tidak bisa dilebur dengan api biasa', null],
  [24, "Leviathan's Scale", 42000, 'Sisik raksasa dari monster penguasa lautan terdalam, kebal terhadap segala sihir elemen air', null],
  [25, 'Holy Grail Fragment', 38000, 'Pecahan cawan suci yang memancarkan cahaya kehidupan, sering dicari untuk ritual penyembuhan absolut', { type: 'xp', value: 400 }],
  [26, 'Starbreaker Claymore', 120000, 'Pedang raksasa bersinar yang menyerap energi rasi bintang; konon tebasannya mampu membelah planet', null],
  [27, 'Genesis Scepter', 110000, 'Tongkat penciptaan yang memegang rahasia awal mula alam semesta, mampu memanipulasi gravitasi', null],
  [28, 'Astral Fragment', 90000, 'Pecahan murni dari dimensi bintang-bintang yang menjadi fondasi pembentuk realitas dan ruang angkasa', { type: 'points', value: 150 }],
  [29, 'Heart of the Primordial', 80000, 'Jantung dari entitas pertama di alam semesta yang masih berdetak, menghasilkan energi tanpa batas', { type: 'xp', value: 1200 }],
  [30, 'Chrono Core', 70000, 'Inti mesin waktu kuno yang melayang dan terus berputar, mampu memperlambat waktu di sekitarnya', { type: 'points', value: 200 }],
];

// Jenis efek yang dikenal bot. Item dengan efek di luar daftar ini diperlakukan
// sebagai tidak bisa dipakai, jadi data lama/rusak di database tidak bikin crash.
const EFFECTS = {
  xp:     { emoji: 'xp',    label: v => `+${v} XP` },
  points: { emoji: 'point', label: v => `+${v} poin` },
};

/** Ubah isi kolom `effect` (string JSON) jadi objek; null kalau kosong/tidak valid. */
function parseEffect(raw) {
  if (!raw) return null;
  try {
    const effect = JSON.parse(raw);
    return EFFECTS[effect.type] ? effect : null;
  } catch {
    return null;
  }
}

/** Teks + emoji siap tampil untuk satu efek, misal "+60 XP". Null kalau bukan item pakai. */
function describeEffect(effect) {
  const meta = effect && EFFECTS[effect.type];
  return meta ? { text: meta.label(effect.value), emoji: meta.emoji } : null;
}

module.exports = { SHOP_CATALOG, parseEffect, describeEffect };
