// Logika murni sistem buff: tanpa SQL dan tanpa Discord, jadi gampang dites.
// Baris buff berbentuk { key, value, expiresAt, charges }; expiresAt null =
// tidak kadaluarsa karena waktu (dibatasi charges atau sekali kill boss).

const BUFF_LABELS = {
  coin: 'Coin',
  xp: 'XP',
  points: 'Poruv',
  quest: 'Progres quest',
  quest_coin: 'Coin quest & boss',
  boss_damage: 'Damage ke boss',
  boss_loot_rate: 'Peluang loot boss',
  boss_drop_amount: 'Jumlah drop boss',
  duration: 'Durasi buff',
  no_consume: 'Item tidak habis',
};

/** Stat reward yang nilainya dikalikan buff. */
const REWARD_STATS = ['coin', 'xp', 'points'];

function isActive(buff, now = Date.now()) {
  if (buff.expiresAt != null && buff.expiresAt <= now) return false;
  if (buff.charges != null && buff.charges <= 0) return false;
  return true;
}

/** Buff dengan key sama tidak menumpuk: yang dipakai pengali terbesar. */
function pickMultiplier(buffs, key, now = Date.now()) {
  return buffs.filter(b => b.key === key && isActive(b, now)).reduce((max, b) => Math.max(max, b.value), 1);
}

function applyMultiplier(amount, multiplier) {
  return Math.round(amount * multiplier);
}

/** Endless Pulse: buff baru bertahan lebih lama. Buff tanpa durasi tidak kena. */
function withDurationBonus(durationMs, bonus = 1) {
  return durationMs == null ? null : Math.round(durationMs * bonus);
}

function formatRemaining(ms) {
  if (ms == null) return 'sampai dipakai';
  const minutes = Math.max(0, Math.ceil(ms / 60000));
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} jam ${rest} menit` : `${hours} jam`;
}

/** Satu baris siap tampil di /buffs, misal "Coin ×1.25 — sisa 24 menit". */
function describeBuff(buff, now = Date.now()) {
  const label = BUFF_LABELS[buff.key] ?? buff.key;
  const value = buff.key === 'no_consume' ? `${buff.charges}x pakai` : `×${buff.value}`;
  const left =
    buff.charges != null && buff.expiresAt == null
      ? `sisa ${buff.charges}x`
      : `sisa ${formatRemaining(buff.expiresAt == null ? null : buff.expiresAt - now)}`;
  return `${label} ${value} — ${left}`;
}

module.exports = {
  BUFF_LABELS,
  REWARD_STATS,
  isActive,
  pickMultiplier,
  applyMultiplier,
  withDurationBonus,
  formatRemaining,
  describeBuff,
};
