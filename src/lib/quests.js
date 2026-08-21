// Katalog & logika murni quest. Tanpa SQL dan tanpa Discord — dipakai oleh
// database/quests.js (penyimpanan) dan commands/economy/quest.js (tampilan).
const { QUEST } = require('../config/constants');

/**
 * Tipe `type` di sini harus sama dengan yang dikirim pemanggil lewat
 * addQuestProgress(). Satuan target:
 * - chat     : jumlah pesan yang lolos anti-spam
 * - voice    : detik (biar tidak hilang pembulatan menit)
 * - lainnya  : sekali kejadian (klaim daily, pakai item, beli, give)
 */
const QUEST_CATALOG = {
  // — Harian —
  chat_15:     { scope: 'daily',  type: 'chat',     target: 15,   reward: 400,  emoji: 'chat',  label: 'Ngobrol 15 pesan' },
  voice_30m:   { scope: 'daily',  type: 'voice',    target: 1800, reward: 500,  emoji: 'voice', label: 'Nongkrong 30 menit di voice' },
  daily_claim: { scope: 'daily',  type: 'daily',    target: 1,    reward: 250,  emoji: 'daily', label: 'Klaim /daily' },
  use_1:       { scope: 'daily',  type: 'use_item', target: 1,    reward: 300,  emoji: 'xp',    label: 'Pakai satu item' },
  buy_1:       { scope: 'daily',  type: 'buy_item', target: 1,    reward: 300,  emoji: 'buy',   label: 'Beli satu item di shop' },

  // — Mingguan —
  chat_100:    { scope: 'weekly', type: 'chat',  target: 100,   reward: 3000, emoji: 'chat',  label: 'Rajin mengobrol 100 pesan' },
  voice_3h:    { scope: 'weekly', type: 'voice', target: 10800, reward: 3500, emoji: 'voice', label: 'Setia di voice 3 jam' },
  give_5:      { scope: 'weekly', type: 'give',  target: 5,     reward: 2500, emoji: 'give',  label: 'Berbagi ke teman 5 kali' },
};

/** Kunci periode harian, sinkron dengan format lastDaily (YYYY-MM-DD UTC). */
function dailyKey(date = new Date()) {
  return `daily:${date.toISOString().slice(0, 10)}`;
}

/**
 * Kunci periode mingguan memakai nomor pekan ISO (Senin awal pekan, aturan
 * Kamis). Dua user di hari yang sama pasti dapat kunci yang sama.
 */
function weeklyKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Minggu = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // geser ke Kamis pekan ini
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `weekly:${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Semua kunci periode yang sedang berjalan. */
function currentPeriodKeys(date = new Date()) {
  return [dailyKey(date), weeklyKey(date)];
}

/**
 * Undi quest untuk satu periode: DAILY_COUNT dari katalog harian plus
 * WEEKLY_COUNT dari mingguan, tanpa duplikat. Deterministik terhadap daftar
 * yang diberikan; pengacakan dilakukan pemanggil sekali saat penugasan.
 */
function drawQuests(periodKey, count, rng = Math.random) {
  const scope = periodKey.startsWith('weekly') ? 'weekly' : 'daily';
  const pool = Object.entries(QUEST_CATALOG).filter(([, q]) => q.scope === scope);
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(rng() * pool.length);
    picked.push({ id: pool[index][0], ...pool[index][1] });
    pool.splice(index, 1);
  }
  return picked;
}

module.exports = { QUEST_CATALOG, dailyKey, weeklyKey, currentPeriodKeys, drawQuests };
