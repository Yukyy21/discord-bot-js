const { db } = require('./connection');
const { updateBalance } = require('./users');
const { getMultiplier } = require('./buffs');
const { QUEST_CATALOG, currentPeriodKeys, drawQuests } = require('../lib/quests');
const { QUEST } = require('../config/constants');

/**
 * Pastikan user punya tugas quest untuk periode yang berjalan. Dipanggil
 * setiap kali progres quest disentuh, jadi penugasan terjadi malas — user
 * yang tidak pernah aktif tidak menyisakan baris apa pun.
 */
function ensureQuests(userId, guildId) {
  const counts = {
    daily: QUEST.DAILY_COUNT,
    weekly: QUEST.WEEKLY_COUNT,
    monthly: QUEST.MONTHLY_COUNT,
  };
  const insert = db.prepare(`
    INSERT OR IGNORE INTO quests (userId, guildId, period, questId, target, reward)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const assign = db.transaction(() => {
    for (const period of currentPeriodKeys()) {
      const existing = db.prepare(
        'SELECT COUNT(*) AS c FROM quests WHERE userId = ? AND guildId = ? AND period = ?',
      ).get(userId, guildId, period).c;
      if (existing > 0) continue;
      for (const quest of drawQuests(period, counts[period.split(':')[0]])) {
        insert.run(userId, guildId, period, quest.id, quest.target, quest.reward);
      }
    }
  });
  assign();
}

/** Quest milik user untuk periode berjalan, sudah digabung metadata katalog. */
function getQuests(userId, guildId) {
  ensureQuests(userId, guildId);
  const rows = db.prepare(`
    SELECT period, questId, target, reward, progress, claimed
    FROM quests
    WHERE userId = ? AND guildId = ?
      AND period IN (${currentPeriodKeys().map(() => '?').join(', ')})
    ORDER BY period, questId
  `).all(userId, guildId, ...currentPeriodKeys());

  // Quest yang sudah dihapus dari katalog tetap ada datanya; lewati saja
  // saat render supaya tidak crash.
  return rows
    .map(row => ({ ...row, quest: QUEST_CATALOG[row.questId] }))
    .filter(row => row.quest);
}

/**
 * Tambah progres semua quest periode berjalan yang tipenya cocok dan belum
 * diklaim. Progres dipatok di target supaya kelebihan tidak menumpuk.
 * `meta` opsional: kalau quest katalog punya field `meta` (mis. rarity untuk
 * use_tier), nilainya harus sama baru progres dihitung.
 */
function addQuestProgress(userId, guildId, type, amount = 1, meta = null) {
  ensureQuests(userId, guildId);
  const rows = db.prepare(`
    SELECT period, questId, progress, target FROM quests
    WHERE userId = ? AND guildId = ? AND claimed = 0
      AND period IN (${currentPeriodKeys().map(() => '?').join(', ')})
  `).all(userId, guildId, ...currentPeriodKeys());

  const update = db.prepare(
    'UPDATE quests SET progress = ?, lockedMultiplier = ? WHERE userId = ? AND guildId = ? AND period = ? AND questId = ?',
  );
  // Insight menggandakan progres, kecuali quest mode 'max' (streak) yang
  // nilainya sudah absolut.
  const questMult = getMultiplier(userId, guildId, 'quest');

  const bump = db.transaction(() => {
    for (const row of rows) {
      const quest = QUEST_CATALOG[row.questId];
      if (quest?.type !== type) continue;
      if (quest.meta && quest.meta !== meta) continue;
      // mode 'max' dipakai daily_streak: streak naik-turun, yang dihitung
      // nilai terbesar yang pernah tercapai, bukan hasil penjumlahan.
      const next = quest.mode === 'max'
        ? Math.min(Math.max(row.progress, amount), row.target)
        : Math.min(row.progress + Math.round(amount * questMult), row.target);
      if (next !== row.progress) {
        // Kunci multiplier saat quest baru selesai (progress mencapai target)
        const justCompleted = next >= row.target && row.progress < row.target;
        const lockedMult = justCompleted
          ? Math.max(getMultiplier(userId, guildId, 'coin'), getMultiplier(userId, guildId, 'quest_coin'))
          : undefined;
        if (lockedMult !== undefined) {
          update.run(next, lockedMult, userId, guildId, row.period, row.questId);
        } else {
          update.run(next, undefined, userId, guildId, row.period, row.questId);
        }
      }
    }
  });
  bump();
}

/**
 * Klaim reward satu quest. Mengembalikan `{ ok, message }` mengikuti pola
 * buyItem/useItem supaya command tinggal menampilkan pesannya.
 */
function claimQuest(userId, guildId, period, questId) {
  const row = db.prepare(`
    SELECT target, reward, progress, claimed, lockedMultiplier FROM quests
    WHERE userId = ? AND guildId = ? AND period = ? AND questId = ?
  `).get(userId, guildId, period, questId);

  if (!row || !QUEST_CATALOG[questId]) {
    return { ok: false, message: 'Quest tidak ditemukan.' };
  }
  if (row.claimed) return { ok: false, message: 'Quest ini sudah pernah diklaim.' };
  if (row.progress < row.target) return { ok: false, message: 'Quest belum selesai.' };

  // Gunakan lockedMultiplier jika ada (saat quest selesai),否则 pakai buff saat klaim
  const lockedMult = row.lockedMultiplier || 1;
  const currentMult = Math.max(
    getMultiplier(userId, guildId, 'coin'),
    getMultiplier(userId, guildId, 'quest_coin'),
  );
  const reward = Math.round(row.reward * Math.max(lockedMult, currentMult));

  const claim = db.transaction(() => {
    db.prepare(`
      UPDATE quests SET claimed = 1 WHERE userId = ? AND guildId = ? AND period = ? AND questId = ?
    `).run(userId, guildId, period, questId);
    updateBalance(userId, guildId, reward);
  });
  claim();

  return { ok: true, reward, message: `Reward **${reward.toLocaleString()}** coin diterima!` };
}

module.exports = { ensureQuests, getQuests, addQuestProgress, claimQuest };
