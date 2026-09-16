// Logika murni redeem code: parsing input modal /code-create dan format
// tampilan reward. Tanpa SQL dan tanpa Discord, jadi gampang dites.

const { BUFF_LABELS } = require('./buffs');

/** Buff yang boleh dipasang lewat redeem code — subset biar admin tidak bisa
 * iseng menaruh key aneh yang tidak berefek di mana pun. */
const REDEEM_BUFF_KEYS = ['coin', 'xp', 'points', 'boss_damage'];

const CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

function isValidCode(code) {
  return CODE_PATTERN.test(String(code ?? ''));
}

/** "NAMA" -> "NAMA" dinormalisasi jadi uppercase biar redeem tidak case-sensitive. */
function normalizeCode(code) {
  return String(code ?? '').trim().toUpperCase();
}

/** Parse field modal "Poruv" / "XP" / "Coin": satu angka bulat positif. */
function parseAmountField(text) {
  const n = Number(String(text ?? '').trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

/**
 * Parse field modal "Buff": format `key nilai menit`, contoh `coin 1.5 60`.
 * Mengembalikan { key, value, durationMinutes } atau null kalau formatnya
 * tidak valid / key tidak dikenal.
 */
function parseBuffField(text) {
  const parts = String(text ?? '').trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const [key, valueRaw, durationRaw] = parts;
  const value = Number(valueRaw);
  const durationMinutes = Number(durationRaw);
  if (!REDEEM_BUFF_KEYS.includes(key)) return null;
  if (!Number.isFinite(value) || value <= 1) return null;
  if (!Number.isFinite(durationMinutes) || !Number.isInteger(durationMinutes) || durationMinutes <= 0) return null;
  return { key, value, durationMinutes };
}

/**
 * Parse field modal "Item": satu baris per item, format `itemId jumlah`,
 * contoh:
 *   5 2
 *   9 1
 * Mengembalikan array [{ itemId, qty }] atau null kalau ada baris yang salah
 * format (biar gagal semua, bukan sebagian diam-diam terlewat).
 */
function parseItemField(text) {
  const lines = String(text ?? '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const items = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length !== 2) return null;
    const itemId = Number(parts[0]);
    const qty = Number(parts[1]);
    if (!Number.isInteger(itemId) || itemId <= 0) return null;
    if (!Number.isInteger(qty) || qty <= 0) return null;
    items.push({ itemId, qty });
  }
  return items;
}

/** Satu baris ringkas per reward, dipakai di embed konfirmasi /code-create & /redeem. */
function describeReward(reward, itemNameLookup = () => null) {
  switch (reward.type) {
    case 'poruv':
      return `+${reward.amount.toLocaleString()} Poruv`;
    case 'xp':
      return `+${reward.amount.toLocaleString()} XP`;
    case 'coin':
      return `+${reward.amount.toLocaleString()} Coin`;
    case 'buff': {
      const label = BUFF_LABELS[reward.key] ?? reward.key;
      return `Buff ${label} ×${reward.value} selama ${reward.durationMinutes} menit`;
    }
    case 'item':
      return reward.items
        .map(it => `${it.qty}x ${itemNameLookup(it.itemId) ?? `Item #${it.itemId}`}`)
        .join(', ');
    default:
      return `Reward tidak dikenal (${reward.type})`;
  }
}

function describeRewards(rewards, itemNameLookup) {
  return rewards.map(r => describeReward(r, itemNameLookup));
}

module.exports = {
  REDEEM_BUFF_KEYS,
  isValidCode,
  normalizeCode,
  parseAmountField,
  parseBuffField,
  parseItemField,
  describeReward,
  describeRewards,
};
    
