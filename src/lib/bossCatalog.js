// Katalog mini boss. Modul murni (tanpa SQL, tanpa Discord) supaya bisa dites.
//
// Field per boss:
// - key        : id internal, dipakai di database dan customId tombol
// - name       : nama yang tampil di embed
// - chance     : peluang terpilih saat jadwal spawn (total harus 100)
// - special    : boss langka, loot & hadiahnya paling besar
// - icon       : nama file gambar boss di `assets/boss/`. Dilampirkan sebagai
//                attachment lalu dipakai jadi thumbnail embed (lib/bossIcons.js)
// - hp         : darah boss. Player tidak punya HP, jadi ini satu-satunya nyawa
//                yang dihitung sistem
// - damage     : rentang damage satu klik tombol serang, SEBELUM buff
//                `boss_damage` (Sharpened Edge / Kingslayer / Star Cleave)
// - reward     : total hadiah yang dibagi ke top 3 damager + last hit
// - counterChance : peluang boss membalas tiap kali seorang player menyerang
// - attacks    : daftar id serangan boss (src/lib/bossAttacks.js) yang bisa
//                diundi saat membalas atau saat mengamuk berkala. Boss tidak
//                bisa membunuh player — efeknya berupa debuff / rampasan coin
// - loot       : tabel drop. `id` merujuk id item di database/shopCatalog.js,
//                `chance` peluang dasar per penerima hadiah (0–1) yang nanti
//                dikali buff `boss_loot_rate`, `amount` jumlah dasar yang
//                dikali buff `boss_drop_amount`.
//
// Catatan balancing (Docs/bossplan.md): damage satu orang bisa ×2 dan loot bisa
// ×2 peluang sekaligus ×2 jumlah, jadi HP dan tabel loot di bawah sudah
// diasumsikan dipukul pemain aktif yang memakai kombinasi item Mythic.

const BOSS_CATALOG = {
  pump_freakin: {
    key: 'pump_freakin',
    name: 'Pump Freakin',
    chance: 45,
    special: false,
    icon: 'pump_freakin.png',
    color: 0xe67e22,
    hp: 24000,
    damage: { min: 300, max: 700 },
    reward: { coin: 24000, xp: 900, points: 240 },
    counterChance: 0.25,
    attacks: ['crushing_chain', 'weakening_aura', 'dizzy_blow', 'coin_snatch'],
    flavor: 'Buah labu raksasa yang membengkak karena mana busuk. Napasnya bau musim gugur yang gagal.',
    loot: [
      { id: 3, chance: 0.45, amount: 1 },  // Iron Ore
      { id: 4, chance: 0.45, amount: 1 },  // Slime Gel
      { id: 10, chance: 0.3, amount: 1 },  // Beast Fang
      { id: 9, chance: 0.25, amount: 1 },  // Glowing Mushroom
      { id: 13, chance: 0.12, amount: 1 }, // Stardust Core
      { id: 19, chance: 0.05, amount: 1 }, // Abyssal Eye
    ],
  },

  clown_orca: {
    key: 'clown_orca',
    name: 'Clown Orca',
    chance: 45,
    special: false,
    icon: 'clown_orca.png',
    color: 0x3498db,
    hp: 30000,
    damage: { min: 350, max: 800 },
    reward: { coin: 30000, xp: 1100, points: 300 },
    counterChance: 0.3,
    attacks: ['crushing_chain', 'greedy_curse', 'blinding_dust', 'dizzy_blow', 'coin_snatch'],
    flavor: 'Orca sirkus yang lepas dari kolamnya. Tetap tersenyum walau sedang menelan seseorang.',
    loot: [
      { id: 8, chance: 0.45, amount: 1 },  // Silver Ingot
      { id: 7, chance: 0.35, amount: 1 },  // Ranger's Bow
      { id: 12, chance: 0.28, amount: 1 }, // Crystal Dagger
      { id: 14, chance: 0.2, amount: 1 },  // Dragon Scale
      { id: 17, chance: 0.1, amount: 1 },  // Void Scepter
      { id: 24, chance: 0.05, amount: 1 }, // Leviathan's Scale
    ],
  },

  ancient_mummy: {
    key: 'ancient_mummy',
    name: 'Ancient Mummy',
    chance: 10,
    special: true,
    icon: 'ancient_mummy.jpeg',
    color: 0xf1c40f,
    hp: 60000,
    damage: { min: 400, max: 900 },
    reward: { coin: 75000, xp: 2600, points: 750 },
    counterChance: 0.4,
    attacks: ['binding_curse', 'cursed_mark', 'greedy_curse', 'hex_of_silence', 'tomb_robbery'],
    flavor: 'Raja tua yang dibalut kain kutukan. Bangkit tiap kali ada yang menyebut namanya di jam ganjil.',
    loot: [
      { id: 15, chance: 0.5, amount: 1 },  // Quantum Chip
      { id: 18, chance: 0.35, amount: 1 }, // Meteorite Alloy
      { id: 16, chance: 0.3, amount: 1 },  // Blade of Desolation
      { id: 21, chance: 0.18, amount: 1 }, // Blade of the Fallen King
      { id: 25, chance: 0.15, amount: 1 }, // Holy Grail Fragment
      { id: 26, chance: 0.06, amount: 1 }, // Starbreaker Claymore
      { id: 27, chance: 0.05, amount: 1 }, // Genesis Scepter
    ],
  },
};

const BOSS_KEYS = Object.keys(BOSS_CATALOG);

const getBoss = key => BOSS_CATALOG[key] ?? null;

module.exports = { BOSS_CATALOG, BOSS_KEYS, getBoss };

