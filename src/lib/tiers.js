// Tier item + bobot undian shop. Modul murni (tanpa database) supaya bisa dites.
const TIER_CONFIG = {
  Common: { weight: 30, color: '#95a5a6' },
  Uncommon: { weight: 25, color: '#2ecc71' },
  Rare: { weight: 20, color: '#3498db' },
  Epic: { weight: 12, color: '#9b59b6' },
  Legendary: { weight: 8, color: '#e67e22' },
  Mythic: { weight: 5, color: '#e74c3c' },
};

// Rarity resmi tiap item bawaan (assets/items/ListItem.md). Item di luar daftar
// ini (misal tambahan manual di database) jatuh ke penentuan lewat harga.
const ITEM_TIERS = {
  'Rusty Shortsword': 'Common',
  'Apprentice Wand': 'Common',
  'Iron Ore': 'Common',
  'Slime Gel': 'Common',
  'Tattered Parchment': 'Common',
  'Steel Broadsword': 'Uncommon',
  "Ranger's Bow": 'Uncommon',
  'Silver Ingot': 'Uncommon',
  'Glowing Mushroom': 'Uncommon',
  'Beast Fang': 'Uncommon',
  'Plasma Blaster': 'Rare',
  'Crystal Dagger': 'Rare',
  'Stardust Core': 'Rare',
  'Dragon Scale': 'Rare',
  'Quantum Chip': 'Rare',
  'Blade of Desolation': 'Epic',
  'Void Scepter': 'Epic',
  'Meteorite Alloy': 'Epic',
  'Abyssal Eye': 'Epic',
  'Tears of the Fallen': 'Epic',
  'Blade of the Fallen King': 'Legendary',
  'Phoenix Whisper Bow': 'Legendary',
  'Adamantine Ingot': 'Legendary',
  "Leviathan's Scale": 'Legendary',
  'Holy Grail Fragment': 'Legendary',
  'Starbreaker Claymore': 'Mythic',
  'Genesis Scepter': 'Mythic',
  'Astral Fragment': 'Mythic',
  'Heart of the Primordial': 'Mythic',
  'Chrono Core': 'Mythic',
};

/** Rarity item: pakai daftar resmi, fallback ke rentang harga. */
function getTier(price, name) {
  if (name && ITEM_TIERS[name]) return ITEM_TIERS[name];
  if (price <= 1500) return 'Common';
  if (price <= 6500) return 'Uncommon';
  if (price <= 18000) return 'Rare';
  if (price <= 48000) return 'Epic';
  if (price <= 55000) return 'Legendary';
  return 'Mythic';
}

/** Undian tanpa pengembalian; peluang tiap item mengikuti bobot tier-nya. */
function weightedRandom(items, count, rng = Math.random) {
  const selected = [];
  const pool = [...items];
  while (selected.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((sum, i) => sum + (TIER_CONFIG[i.tier]?.weight ?? 0), 0);
    if (totalWeight <= 0) break;
    let rand = rng() * totalWeight;
    for (let j = 0; j < pool.length; j++) {
      rand -= TIER_CONFIG[pool[j].tier]?.weight ?? 0;
      if (rand <= 0) {
        selected.push(pool[j]);
        pool.splice(j, 1);
        break;
      }
    }
  }
  return selected;
}

module.exports = { TIER_CONFIG, ITEM_TIERS, getTier, weightedRandom };
