// Emoji per item shop + per tier. ID diambil dari assets/items/emoji_itam.md.
// Nama di sini harus sama persis dengan nama item di database/shopCatalog.js.
// ID kosong / item tidak dikenal otomatis jatuh ke fallback unicode.
const { ITEM_EMOJI_IDS = {} } = require('../config');

const ITEM_EMOJIS = {
  'Rusty Shortsword': ['Rusty_Shortsword', '1540348673010172035'],
  'Apprentice Wand': ['Apprentice_Wand', '1540348629808848977'],
  'Iron Ore': ['iron_ore', '1540348657428070533'],
  'Slime Gel': ['slime_gel', '1540348678571556997'],
  'Tattered Parchment': ['Tattered_Parchment', '1540348686171770910'],
  'Steel Broadsword': ['Steel_Broadsword', '1540348684355510352'],
  "Ranger's Bow": ['Rangers_Bow', '1540348670900306010'],
  'Silver Ingot': ['Silver_ingot', '1540348675967164426'],
  'Glowing Mushroom': ['Glowing_Mushroom', '1540348650222522470'],
  'Beast Fang': ['Beast_Fang', '1540348634346946560'],
  'Plasma Blaster': ['Plasma_Blaster', '1540348667041546393'],
  'Crystal Dagger': ['Crystal_Dagger', '1540348643003867206'],
  'Stardust Core': ['Stardust_Core', '1540348682354954320'],
  'Dragon Scale': ['Dragon_Scale', '1540348644849487882'],
  'Quantum Chip': ['Quantum_Chip', '1540348668933185557'],
  'Blade of Desolation': ['Blade_of_Desolation', '1540348636251295765'],
  'Void Scepter': ['Void_Scepter', '1540348690504351794'],
  'Meteorite Alloy': ['Meteorite_Alloy', '1540348662704644217'],
  'Abyssal Eye': ['Abyssal_Eye', '1540348626230972467'],
  'Tears of the Fallen': ['Tears_of_the_Fallen', '1540348687983714344'],
  'Blade of the Fallen King': ['Blade_of_the_fallen_King', '1540348638742450206'],
  'Phoenix Whisper Bow': ['Phoenix_Whisper_Bow', '1540348664793399348'],
  'Adamantine Ingot': ['Adamantine_Ingot', '1540348628017750046'],
  "Leviathan's Scale": ['Leviathans_Scale', '1540348660049649664'],
  'Holy Grail Fragment': ['Holy_Grail_Fragment', '1540348655729647707'],
  'Starbreaker Claymore': ['Starbreaker_Claymore', '1540348680408662158'],
  'Genesis Scepter': ['Genesis_Scepter', '1540348647001301073'],
  'Astral Fragment': ['Astral_Fragment', '1540348632031563888'],
  'Heart of the Primordial': ['Heart_of_the_Primordial', '1540348651887525939'],
  'Chrono Core': ['Chrono_Core', '1540348640256590055'],
};

const TIER_MARKS = {
  Common: '⚪',
  Uncommon: '🟢',
  Rare: '🔵',
  Epic: '🟣',
  Legendary: '🟠',
  Mythic: '🔴',
};

const FALLBACK = '📦';

/** Mention emoji item siap tempel di embed. Fallback ke 📦 kalau tidak dikenal. */
function itemEmoji(name) {
  const entry = ITEM_EMOJIS[name];
  if (!entry) return FALLBACK;
  const [emojiName, baseId] = entry;
  const id = ITEM_EMOJI_IDS[name] ?? baseId;
  return id ? `<:${emojiName}:${id}>` : FALLBACK;
}

/** Objek emoji untuk Button / SelectMenu builder. */
function itemEmojiObject(name) {
  const entry = ITEM_EMOJIS[name];
  if (!entry) return { name: FALLBACK };
  const [emojiName, baseId] = entry;
  const id = ITEM_EMOJI_IDS[name] ?? baseId;
  return id ? { id, name: emojiName } : { name: FALLBACK };
}

/** Penanda warna tier, dipakai sebagai badge rarity di /shop dan /inventory. */
function tierMark(tier) {
  return TIER_MARKS[tier] ?? '⚫';
}

module.exports = { ITEM_EMOJIS, TIER_MARKS, itemEmoji, itemEmojiObject, tierMark };
