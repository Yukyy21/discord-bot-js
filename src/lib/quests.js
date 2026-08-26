// Katalog & logika murni quest. Tanpa SQL dan tanpa Discord — dipakai oleh
// database/quests.js (penyimpanan) dan commands/economy/quest.js (tampilan).

/**
 * Tipe `type` di sini harus sama dengan yang dikirim pemanggil lewat
 * addQuestProgress(). Satuan target:
 * - chat        : jumlah pesan yang lolos anti-spam
 * - voice       : detik (biar tidak hilang pembulatan menit)
 * - spend       : total coin yang dibelanjakan lewat /buy
 * - daily_streak: angka streak saat /daily diklaim
 * - boss_join   : ikut menyerang satu mini boss (dihitung sekali per boss)
 * - boss_kill   : masuk daftar penerima hadiah saat mini boss tumbang
 * - lainnya     : sekali kejadian (klaim daily, pakai/beli item, give, naik level)
 *
 * Field opsional per quest:
 * - mode: 'max' — progres mengambil nilai terbesar yang pernah dikirim, bukan
 *   menambah. Dipakai daily_streak karena streak naik-turun, menjumlahkannya
 *   tidak berarti.
 * - meta: string yang harus sama dengan parameter `meta` di addQuestProgress().
 *   Dipakai use_tier untuk membedakan rarity item yang diminta.
 */
const QUEST_CATALOG = {
  // — Harian —
  chat_15:     { scope: 'daily',  type: 'chat',     target: 15,   reward: 400,  emoji: 'chat',  label: 'Ngobrol 15 pesan' },
  voice_30m:   { scope: 'daily',  type: 'voice',    target: 1800, reward: 500,  emoji: 'voice', label: 'Nongkrong 30 menit di voice' },
  daily_claim: { scope: 'daily',  type: 'daily',    target: 1,    reward: 250,  emoji: 'daily', label: 'Klaim /daily' },
  use_1:       { scope: 'daily',  type: 'use_item', target: 1,    reward: 300,  emoji: 'xp',    label: 'Pakai satu item' },
  buy_1:       { scope: 'daily',  type: 'buy_item', target: 1,    reward: 300,  emoji: 'buy',   label: 'Beli satu item di shop' },
  spend_2000:  { scope: 'daily',  type: 'spend',    target: 2000, reward: 400,  emoji: 'shop',  label: 'Belanja 2.000 coin di /shop' },
  streak_1:    { scope: 'daily',  type: 'daily_streak', mode: 'max', target: 1, reward: 300, emoji: 'streak', label: 'Klaim /daily hari ini' },
  boss_join_1: { scope: 'daily',  type: 'boss_join', target: 1,    reward: 450,  emoji: 'boss',  label: 'Ikut menyerang mini boss' },

  // — Mingguan —
  chat_100:      { scope: 'weekly', type: 'chat',  target: 100,   reward: 3000, emoji: 'chat',  label: 'Rajin mengobrol 100 pesan' },
  voice_3h:      { scope: 'weekly', type: 'voice', target: 10800, reward: 3500, emoji: 'voice', label: 'Setia di voice 3 jam' },
  give_5:        { scope: 'weekly', type: 'give',  target: 5,     reward: 2500, emoji: 'give',  label: 'Berbagi ke teman 5 kali' },
  level_3:       { scope: 'weekly', type: 'level_up', target: 3,  reward: 3000, emoji: 'level', label: 'Naik 3 level pekan ini' },
  spend_15000:   { scope: 'weekly', type: 'spend', target: 15000, reward: 2500, emoji: 'shop',  label: 'Belanja total 15.000 coin' },
  use_epic:      { scope: 'weekly', type: 'use_tier', meta: 'Epic', target: 1,  reward: 2200, emoji: 'xp',    label: 'Pakai satu item Epic' },
  use_legendary: { scope: 'weekly', type: 'use_tier', meta: 'Legendary', target: 1, reward: 4000, emoji: 'xp', label: 'Pakai satu item Legendary' },
  boss_kill_2:   { scope: 'weekly', type: 'boss_kill', target: 2,  reward: 4500, emoji: 'boss',  label: 'Dapat hadiah dari 2 mini boss' },

  // — Bulanan —
  chat_500:    { scope: 'monthly', type: 'chat',  target: 500,   reward: 10000, emoji: 'chat',  label: 'Ngobrol 500 pesan sebulan' },
  voice_12h:   { scope: 'monthly', type: 'voice', target: 43200, reward: 12000, emoji: 'voice', label: 'Nongkrong 12 jam sebulan' },
  spend_60000: { scope: 'monthly', type: 'spend', target: 60000, reward: 9000,  emoji: 'shop',  label: 'Belanja total 60.000 coin sebulan' },
  level_8:     { scope: 'monthly', type: 'level_up', target: 8,  reward: 15000, emoji: 'level', label: 'Naik 8 level sebulan' },
  streak_14:   { scope: 'monthly', type: 'daily_streak', mode: 'max', target: 14, reward: 8000, emoji: 'streak', label: 'Capai streak daily 14 hari' },
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

/** Kunci periode bulanan: YYYY-MM UTC, ganti bulan = mulai dari nol. */
function monthlyKey(date = new Date()) {
  return `monthly:${date.toISOString().slice(0, 7)}`;
}

/** Semua kunci periode yang sedang berjalan. */
function currentPeriodKeys(date = new Date()) {
  return [dailyKey(date), weeklyKey(date), monthlyKey(date)];
}

/**
 * Undi quest untuk satu periode sesuai scope kuncinya (daily/weekly/monthly),
 * tanpa duplikat. Deterministik terhadap daftar yang diberikan; pengacakan
 * dilakukan pemanggil sekali saat penugasan.
 */
function drawQuests(periodKey, count, rng = Math.random) {
  const scope = ['weekly', 'monthly'].find(s => periodKey.startsWith(s)) ?? 'daily';
  const pool = Object.entries(QUEST_CATALOG).filter(([, q]) => q.scope === scope);
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(rng() * pool.length);
    picked.push({ id: pool[index][0], ...pool[index][1] });
    pool.splice(index, 1);
  }
  return picked;
}

module.exports = { QUEST_CATALOG, dailyKey, weeklyKey, monthlyKey, currentPeriodKeys, drawQuests };

