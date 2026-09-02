const {
  addPoints,
  addXp,
  applyBuff,
  addVoiceSeconds,
  addQuestProgress,
  saveVoiceSession,
  getVoiceSession,
  deleteVoiceSession,
  getAllVoiceSessions,
} = require('../database');
const { VOICE } = require('../config/constants');
const { reconcileLevels } = require('../lib/levelingManager');
const logger = require('../lib/logger');

const log = logger.scope('Voice');

// Sesi voice yang sedang berjalan, key-nya `guildId:userId`. Memori tetap
// sumber kebenaran selama bot hidup, tapi setiap perubahan ditulis juga ke
// tabel `voice_sessions` — kalau bot mati di tengah sesi, waktunya bisa
// dilanjutkan lewat restoreVoiceTracking() alih-alih hangus.
const sessions = new Map();

// Referensi client untuk membaca voiceStates saat menilai kelayakan. Terisi
// saat ready; sebelum itu semua sesi dianggap belum layak.
let clientRef = null;

/**
 * Waktu voice layak poin kalau channelnya bukan AFK dan berisi minimal
 * MIN_LISTENERS manusia yang tidak deaf — user yang dinilai ikut terhitung,
 * jadi duduk berdua tanpa deaf sudah cukup.
 */
function isEligible(guildId, userId) {
  if (!clientRef) return false;
  const guild = clientRef.guilds.cache.get(guildId);
  const state = guild?.voiceStates.cache.get(userId);
  if (!state?.channelId) return false;
  if (state.channelId === guild.afkChannelId) return false;

  let listeners = 0;
  for (const other of guild.voiceStates.cache.values()) {
    if (other.channelId !== state.channelId) continue;
    if (other.member?.user.bot) continue;
    if (other.selfDeaf || other.serverDeaf) continue;
    listeners++;
    if (listeners >= VOICE.MIN_LISTENERS) return true;
  }
  return false;
}

function startSession(guildId, userId) {
  const now = Date.now();
  const session = {
    userId,
    guildId,
    joinedAt: now,
    lastGrant: now,
    eligible: isEligible(guildId, userId),
  };
  sessions.set(`${guildId}:${userId}`, session);
  saveVoiceSession(userId, guildId, session);
}

/** Rekonsiliasi level setelah XP voice masuk. */
function reconcileSession(guildId, userId) {
  reconcileLevels(clientRef, guildId, [{ userId }]);
}

/** Bayar sisa poin yang belum sempat dibagi, lalu catat total durasinya. */
function endSession(guildId, userId) {
  const key = `${guildId}:${userId}`;
  // Kalau bot sempat restart dan sesi belum di-restore, data masih ada di
  // tabel — pakai itu supaya waktu voice sebelum mati tetap dibayar.
  let session = sessions.get(key);
  if (!session) {
    const saved = getVoiceSession(userId, guildId);
    if (!saved) return;
    session = {
      userId,
      guildId,
      joinedAt: saved.joinedAt,
      lastGrant: saved.lastGrant,
      eligible: !!saved.eligible,
    };
  }

  const now = Date.now();
  // Sisa poin hanya dibayar kalau sesi berakhir dalam kondisi layak; kalau
  // tidak, lastGrant sudah maju sepanjang masa tidak layak jadi memang nihil.
  if (session.eligible) {
    const chunks = Math.floor((now - session.lastGrant) / VOICE.INTERVAL_MS);
    if (chunks > 0) {
      addPoints(
        userId,
        session.guildId,
        applyBuff(userId, session.guildId, 'points', chunks * VOICE.POINTS_PER_INTERVAL),
      );
      addXp(
        userId,
        session.guildId,
        applyBuff(userId, session.guildId, 'xp', chunks * VOICE.XP_PER_INTERVAL),
      );
      reconcileSession(session.guildId, userId);
    }
  }

  const seconds = Math.floor((now - session.joinedAt) / 1000);
  if (seconds > 0) {
    addVoiceSeconds(userId, session.guildId, seconds);
    addQuestProgress(userId, session.guildId, 'voice', seconds);
  }

  sessions.delete(key);
  deleteVoiceSession(userId, guildId);
}

/**
 * Sinkronkan status layak satu sesi setiap kondisi channel berubah (ada yang
 * join, keluar, pindah, atau deafen). Saat kehilangan kelayakan, sisa masa
 * layak dibayar seketika lalu jam poin direset — begitu juga saat mendapat
 * kelayakan, supaya waktu sendirian tidak pernah ikut menumpuk jadi poin.
 */
function syncEligibility(guildId, userId) {
  const session = sessions.get(`${guildId}:${userId}`);
  if (!session) return;

  const eligible = isEligible(guildId, userId);
  if (eligible === session.eligible) return;

  const now = Date.now();
  if (!eligible) {
    const chunks = Math.floor((now - session.lastGrant) / VOICE.INTERVAL_MS);
    if (chunks > 0) {
      addPoints(
        session.userId,
        guildId,
        applyBuff(session.userId, guildId, 'points', chunks * VOICE.POINTS_PER_INTERVAL),
      );
      addXp(
        session.userId,
        guildId,
        applyBuff(session.userId, guildId, 'xp', chunks * VOICE.XP_PER_INTERVAL),
      );
      reconcileSession(guildId, session.userId);
    }
  }
  session.lastGrant = now;
  session.eligible = eligible;
  saveVoiceSession(session.userId, guildId, session);
}

// Pembagi poin berkala untuk yang masih betah di voice.
setInterval(() => {
  const now = Date.now();
  for (const session of sessions.values()) {
    // Tidak layak: majukan jam poin supaya masa sendirian tidak menumpuk
    // utang yang tiba-tiba cair begitu teman masuk.
    if (!session.eligible) {
      session.lastGrant = now;
      saveVoiceSession(session.userId, session.guildId, session);
      continue;
    }
    if (now - session.lastGrant < VOICE.INTERVAL_MS) continue;
    addPoints(
      session.userId,
      session.guildId,
      applyBuff(session.userId, session.guildId, 'points', VOICE.POINTS_PER_INTERVAL),
    );
    addXp(
      session.userId,
      session.guildId,
      applyBuff(session.userId, session.guildId, 'xp', VOICE.XP_PER_INTERVAL),
    );
    reconcileSession(session.guildId, session.userId);
    session.lastGrant = now;
    saveVoiceSession(session.userId, session.guildId, session);
  }
}, VOICE.INTERVAL_MS);

/**
 * Dipanggil sekali saat bot siap. Dua hal yang dilakukan:
 * 1. User yang sudah duduk di voice sebelum bot menyala tetap dilacak.
 * 2. Sesi yang tersimpan di tabel (bot mati di tengah sesi) dilanjutkan dengan
 *    waktu aslinya, jadi durasi sebelum mati tidak hangus.
 */
function restoreVoiceTracking(ref) {
  clientRef = ref;
  let resumed = 0;
  let fresh = 0;
  const liveKeys = new Set();

  for (const guild of ref.guilds.cache.values()) {
    for (const state of guild.voiceStates.cache.values()) {
      if (!state.channelId) continue;
      if (state.member?.user.bot) continue;
      const key = `${guild.id}:${state.id}`;
      liveKeys.add(key);
      if (sessions.has(key)) continue;

      const saved = getVoiceSession(state.id, guild.id);
      if (!saved) {
        startSession(guild.id, state.id);
        fresh++;
        continue;
      }

      // Lanjutkan sesi lama dengan joinedAt/lastGrant aslinya.
      const session = {
        userId: state.id,
        guildId: guild.id,
        joinedAt: saved.joinedAt,
        lastGrant: saved.lastGrant,
        eligible: !!saved.eligible,
      };
      // Kelayakan bisa berubah selama bot mati (teman keluar, pindah AFK).
      // Masa downtime tidak jelas siapa bersama siapa — kalau status berubah,
      // majukan jam poin tanpa membayar supaya tidak ada pembayaran hantu.
      const eligibleNow = isEligible(guild.id, state.id);
      if (eligibleNow !== session.eligible) {
        session.lastGrant = Date.now();
        session.eligible = eligibleNow;
      }
      sessions.set(key, session);
      saveVoiceSession(session.userId, session.guildId, session);
      resumed++;
    }
  }

  // Baris sisa = user yang keluar voice saat bot mati. Buang supaya tidak
  // menggantung dan ikut terbayar di sesi yang jauh lebih baru.
  for (const row of getAllVoiceSessions()) {
    if (!liveKeys.has(`${row.guildId}:${row.userId}`)) deleteVoiceSession(row.userId, row.guildId);
  }

  if (resumed + fresh > 0) {
    log.info(`Tracking dilanjutkan: ${resumed} sesi dari sebelum restart, ${fresh} sesi baru.`);
  }
  return { resumed, fresh };
}

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const guild = newState.guild || oldState.guild;
    const guildId = guild.id;
    const wasInVoice = oldState.channelId !== null;
    const nowInVoice = newState.channelId !== null;

    // Pindah antar channel tidak memutus sesi, jadi hanya join & leave yang
    // diproses. Kelayakan poin tetap dievaluasi ulang di bawah.
    if (!wasInVoice && nowInVoice) startSession(guildId, member.id);
    else if (wasInVoice && !nowInVoice) endSession(guildId, member.id);

    // Satu peristiwa bisa mengubah nasib orang lain di channel yang sama —
    // satu-satunya pendengar keluar bikin yang tertahan jadi sendirian. Jadi
    // semua sesi di kedua channel terkait ikut disinkronkan.
    const affectedChannels = new Set([oldState.channelId, newState.channelId].filter(Boolean));
    for (const state of guild.voiceStates.cache.values()) {
      if (!affectedChannels.has(state.channelId)) continue;
      if (state.member?.user.bot) continue;
      syncEligibility(guildId, state.id);
    }
  },
  restoreVoiceTracking,
  isEligible,
  endSession, // diekspos untuk smoke test
};
