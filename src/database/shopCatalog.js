// Katalog dasar item shop. Dipakai sekali saat tabel `shop_items` masih kosong;
// setelah itu data hidup di database, jadi mengubah harga di sini tidak otomatis
// mengubah harga yang sudah tersimpan.
//
// Format: [id, nama, harga, deskripsi]. Harga menentukan tier di lib/shopRotation.js.
const SHOP_CATALOG = [
  [1, 'Rusty Shortsword', 1200, 'Pedang pendek peninggalan prajurit yang sudah berkarat'],
  [2, 'Apprentice Wand', 1500, 'Tongkat sihir kayu biasa yang sering dipakai pemula'],
  [3, 'Iron Ore', 800, 'Bijih besi mentah yang belum diolah'],
  [4, 'Slime Gel', 600, 'Lendir lengket yang dijatuhkan oleh monster tingkat rendah'],
  [5, 'Tattered Parchment', 500, 'Gulungan kertas usang yang tulisannya sudah hampir pudar'],
  [6, 'Steel Broadsword', 6500, 'Pedang baja kokoh dengan daya tebas yang mantap'],
  [7, "Ranger's Bow", 5500, 'Busur andalan para pemburu untuk menyerang dari jauh'],
  [8, 'Silver Ingot', 4000, 'Batangan perak murni yang sudah dilebur sempurna'],
  [9, 'Glowing Mushroom', 3500, 'Jamur beracun yang memancarkan cahaya di tempat gelap'],
  [10, 'Beast Fang', 3000, 'Taring tajam utuh dari monster buas di hutan'],
  [11, 'Plasma Blaster', 18000, 'Senjata api berenergi plasma dengan akurasi tinggi'],
  [12, 'Crystal Dagger', 15000, 'Belati tajam yang terbuat dari pecahan kristal es abadi'],
  [13, 'Stardust Core', 12000, 'Inti energi murni yang jatuh dari bongkahan bintang'],
  [14, 'Dragon Scale', 10000, 'Sisik naga pelindung yang sangat keras dan tahan api'],
  [15, 'Quantum Chip', 8500, 'Komponen cybernetic canggih peninggalan teknologi masa lalu'],
  [16, 'Blade of Desolation', 48000, 'Pedang besar yang memancarkan aura kegelapan dan keputusasaan'],
  [17, 'Void Scepter', 42000, 'Tongkat penyihir yang mampu memanipulasi gravitasi di sekitarnya'],
  [18, 'Meteorite Alloy', 35000, 'Logam super kuat hasil tempaan batu meteor dari luar angkasa'],
  [19, 'Abyssal Eye', 28000, 'Mata monster raksasa yang diambil dari dasar jurang terdalam'],
  [20, 'Tears of the Fallen', 22000, 'Kristal ajaib yang terbentuk dari air mata dewa yang gugur'],
  [21, 'Blade of the Fallen King', 55000, 'Pedang peninggalan raja lalim yang ditakuti, masih memancarkan aura intimidasi'],
  [22, 'Phoenix Whisper Bow', 50000, 'Busur yang terbuat dari bulu burung Phoenix, anak panahnya meledak menjadi api abadi'],
  [23, 'Adamantine Ingot', 45000, 'Balok logam terkeras di dunia yang tidak bisa dilebur dengan api biasa'],
  [24, "Leviathan's Scale", 42000, 'Sisik raksasa dari monster penguasa lautan terdalam, kebal terhadap segala sihir elemen air'],
  [25, 'Holy Grail Fragment', 38000, 'Pecahan cawan suci yang memancarkan cahaya kehidupan, sering dicari untuk ritual penyembuhan absolut'],
  [26, 'Starbreaker Claymore', 120000, 'Pedang raksasa bersinar yang menyerap energi rasi bintang; konon tebasannya mampu membelah planet'],
  [27, 'Genesis Scepter', 110000, 'Tongkat penciptaan yang memegang rahasia awal mula alam semesta, mampu memanipulasi gravitasi'],
  [28, 'Astral Fragment', 90000, 'Pecahan murni dari dimensi bintang-bintang yang menjadi fondasi pembentuk realitas dan ruang angkasa'],
  [29, 'Heart of the Primordial', 80000, 'Jantung dari entitas pertama di alam semesta yang masih berdetak, menghasilkan energi tanpa batas'],
  [30, 'Chrono Core', 70000, 'Inti mesin waktu kuno yang melayang dan terus berputar, mampu memperlambat waktu di sekitarnya'],
];

module.exports = { SHOP_CATALOG };
