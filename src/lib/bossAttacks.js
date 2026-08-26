// Serangan balik mini boss. Modul murni (tanpa SQL, tanpa Discord) supaya bisa
// dites: katalog debuff, undian serangan boss, dan aturan penggabungannya.
//
// ATURAN BIAR TIDAK BENTROK DENGAN ABILITY ITEM
// - Semua debuff disimpan di tabel `user_buffs` dengan key ber-prefix `debuff:`
//   sehingga tidak pernah tercampur dengan key buff item (`coin`, `xp`,
//   `boss_damage`, dst). Buff item tetap dihitung dengan pengali TERBESAR,
//   debuff dihitung terpisah lalu dikalikan setelahnya.
// - Debuff dengan key sama juga TIDAK menumpuk: yang dipakai efek terburuk.
// - Debuff TIDAK diperpanjang Endless Pulse (`duration`) dan TIDAK ikut
//   diperpanjang Rekindle (`extend_buffs`) — kedua ability itu hanya menyentuh
//   buff milik user.
// - Chrono Core (`cooldown_reset`) membersihkan semua debuff; Tears of the
//   Fallen (`daily_reset`) tidak.
// - Debuff tidak pernah membatalkan ability item, hanya mengalikan hasil
//   akhirnya (mis. Kingslayer ×1.6 lalu Aura Melemahkan ×0.65 = ×1.04).

const DEBUFF_PREFIX = 'debuff:';

/**
 * Metadata tiap key debuff.
 * - worse: arah nilai yang dianggap lebih parah saat dua debuff bertumpuk
 *          ('higher' = angka besar makin parah, 'lower' = angka kecil makin parah)
 */
const DEBUFF_META = {
  'debuff:cooldown': { label: 'Cooldown serang', worse: 'higher' },
  'debuff:damage': { label: 'Damage ke boss', worse: 'lower' },
  'debuff:loot': { label: 'Peluang loot boss', worse: 'lower' },
  'debuff:xp': { label: 'XP didapat', worse: 'lower' },
  'debuff:points': { label: 'Poin didapat', worse: 'lower' },
  'debuff:coin': { label: 'Coin didapat', worse: 'lower' },
  'debuff:miss': { label: 'Serangan meleset', worse: 'higher' },
};

const MINUTE = 60 * 1000;

/**
 * Katalog serangan boss. Satu serangan bisa memasang beberapa efek sekaligus.
 * effects[].charges = dibatasi jumlah pemakaian, bukan waktu.
 * kind 'steal' = efek instan (merampas coin), tidak menyisakan debuff.
 */
const BOSS_ATTACKS = {
  crushing_chain: {
    id: 'crushing_chain',
    name: 'Rantai Berat',
    text: 'Rantai boss membelit tanganmu — cooldown serangmu jadi dua kali lipat.',
    effects: [{ key: 'debuff:cooldown', value: 2, durationMs: 5 * MINUTE }],
  },
  binding_curse: {
    id: 'binding_curse',
    name: 'Belenggu Kutukan',
    text: 'Kutukan tua mengunci kakimu — cooldown serangmu jadi tiga kali lipat.',
    effects: [{ key: 'debuff:cooldown', value: 3, durationMs: 5 * MINUTE }],
  },
  weakening_aura: {
    id: 'weakening_aura',
    name: 'Aura Melemahkan',
    text: 'Ototmu mendadak lemas — damage ke boss turun sementara.',
    effects: [{ key: 'debuff:damage', value: 0.65, durationMs: 5 * MINUTE }],
  },
  greedy_curse: {
    id: 'greedy_curse',
    name: 'Kutukan Serakah',
    text: 'Boss menandaimu sebagai orang tamak — peluang loot boss dipotong setengah.',
    effects: [{ key: 'debuff:loot', value: 0.5, durationMs: 15 * MINUTE }],
  },
  blinding_dust: {
    id: 'blinding_dust',
    name: 'Debu Kabur',
    text: 'Debu masuk ke matamu — XP yang kamu dapat berkurang sebentar.',
    effects: [{ key: 'debuff:xp', value: 0.75, durationMs: 15 * MINUTE }],
  },
  hex_of_silence: {
    id: 'hex_of_silence',
    name: 'Kutukan Bisu',
    text: 'Suaramu tercekat — poin yang kamu dapat berkurang sebentar.',
    effects: [{ key: 'debuff:points', value: 0.8, durationMs: 10 * MINUTE }],
  },
  dizzy_blow: {
    id: 'dizzy_blow',
    name: 'Pukulan Linglung',
    text: 'Kepalamu berdenyut — satu serangan berikutnya meleset total.',
    effects: [{ key: 'debuff:miss', value: 1, charges: 1 }],
  },
  coin_snatch: {
    id: 'coin_snatch',
    name: 'Rampas Koin',
    kind: 'steal',
    text: 'Boss menyabet kantongmu dan membawa lari sebagian coin di dompet.',
    steal: { percent: 0.03, max: 1500 },
  },
  tomb_robbery: {
    id: 'tomb_robbery',
    name: 'Perampokan Makam',
    kind: 'steal',
    text: 'Tangan perban menjarah dompetmu tanpa ampun.',
    steal: { percent: 0.06, max: 5000 },
  },
  cursed_mark: {
    id: 'cursed_mark',
    name: 'Tanda Kutukan',
    text: 'Perban boss menempel di bahumu — kamu jadi lambat sekaligus lemah.',
    effects: [
      { key: 'debuff:cooldown', value: 2.5, durationMs: 10 * MINUTE },
      { key: 'debuff:damage', value: 0.7, durationMs: 10 * MINUTE },
    ],
  },
};

const getBossAttack = id => BOSS_ATTACKS[id] ?? null;

const isDebuffRow = row => typeof row?.key === 'string' && row.key.startsWith(DEBUFF_PREFIX);

function isActiveRow(row, now = Date.now()) {
  if (row.expiresAt != null && row.expiresAt <= now) return false;
  if (row.charges != null && row.charges <= 0) return false;
  return true;
}

/**
 * Pengali debuff untuk satu key. Debuff sejenis tidak menumpuk: dipakai yang
 * paling parah. Tidak ada debuff = 1 (netral).
 */
function pickDebuff(rows, key, now = Date.now()) {
  const meta = DEBUFF_META[key];
  const values = rows.filter(r => r.key === key && isActiveRow(r, now)).map(r => r.value);
  if (!values.length) return 1;
  return meta?.worse === 'higher' ? Math.max(1, ...values) : Math.min(1, ...values);
}

/** Undi satu serangan boss dari daftar milik boss tersebut. */
function pickBossAttack(boss, rng = Math.random) {
  const pool = (boss.attacks ?? []).map(getBossAttack).filter(Boolean);
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)] ?? pool[pool.length - 1];
}

/** True kalau serangan balik boss terpicu pada klik serang ini. */
function rollCounter(boss, rng = Math.random) {
  return rng() < (boss.counterChance ?? 0);
}

/** Jumlah coin yang dirampas boss, dibatasi isi dompet dan batas atas. */
function stealAmount(attack, balance) {
  if (attack.kind !== 'steal') return 0;
  const wallet = Math.max(0, Number(balance) || 0);
  return Math.min(wallet, attack.steal.max, Math.floor(wallet * attack.steal.percent));
}

/** Satu baris siap tampil di `/buffs`, misal "Cooldown serang ×2 — sisa 4 menit". */
function describeDebuff(row, now = Date.now()) {
  const meta = DEBUFF_META[row.key];
  const label = meta?.label ?? row.key.replace(DEBUFF_PREFIX, '');
  if (row.key === 'debuff:miss') return `${label} — sisa ${row.charges}x serangan`;
  const left = row.expiresAt == null
    ? 'sampai dibersihkan'
    : `${Math.max(0, Math.ceil((row.expiresAt - now) / 60000))} menit`;
  return `${label} ×${row.value} — sisa ${left}`;
}

module.exports = {
  DEBUFF_PREFIX,
  DEBUFF_META,
  BOSS_ATTACKS,
  getBossAttack,
  isDebuffRow,
  pickDebuff,
  pickBossAttack,
  rollCounter,
  stealAmount,
  describeDebuff,
};
