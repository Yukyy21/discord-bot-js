const { addPoints, addVoiceSeconds } = require('../database');
const { VOICE } = require('../config/constants');

// Sesi voice yang sedang berjalan, key-nya `guildId:userId`.
// Sengaja disimpan di memori: kalau bot restart, sesi dibangun ulang lewat
// restoreVoiceTracking() dari daftar member yang saat itu ada di voice.
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
  sessions.set(`${guildId}:${userId}`, {
    userId,
    guildId,
    joinedAt: now,
    lastGrant: now,
    eligible: isEligible(guildId, userId),
  });
}

/** Bayar sisa poin yang belum sempat dibagi, lalu catat total durasinya. */
function endSession(guildId, userId) {
  const key = `${guildId}:${userId}`;
  const session = sessions.get(key);
  if (!session) return;

  const now = Date.now();
  // Sisa poin hanya dibayar kalau sesi berakhir dalam kondisi layak; kalau
  // tidak, lastGrant sudah maju sepanjang masa tidak layak jadi memang nihil.
  if (session.eligible) {
    const chunks = Math.floor((now - session.lastGrant) / VOICE.INTERVAL_MS);
    if (chunks > 0) addPoints(userId, session.guildId, chunks * VOICE.POINTS_PER_INTERVAL);
  }

  const seconds = Math.floor((now - session.joinedAt) / 1000);
  if (seconds > 0) addVoiceSeconds(userId, session.guildId, seconds);

  sessions.delete(key);
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
    if (chunks > 0) addPoints(session.userId, guildId, chunks * VOICE.POINTS_PER_INTERVAL);
  }
  session.lastGrant = now;
  session.eligible = eligible;
}

// Pembagi poin berkala untuk yang masih betah di voice.
setInterval(() => {
  const now = Date.now();
  for (const session of sessions.values()) {
    // Tidak layak: majukan jam poin supaya masa sendirian tidak menumpuk
    // utang yang tiba-tiba cair begitu teman masuk.
    if (!session.eligible) {
      session.lastGrant = now;
      continue;
    }
    if (now - session.lastGrant < VOICE.INTERVAL_MS) continue;
    addPoints(session.userId, session.guildId, VOICE.POINTS_PER_INTERVAL);
    session.lastGrant = now;
  }
}, VOICE.INTERVAL_MS);

/**
 * Dipanggil sekali saat bot siap. Tanpa ini, orang yang sudah duduk di voice
 * sebelum bot menyala tidak akan dapat poin sampai dia keluar-masuk lagi.
 */
function restoreVoiceTracking(ref) {
  clientRef = ref;
  let restored = 0;
  for (const guild of ref.guilds.cache.values()) {
    for (const state of guild.voiceStates.cache.values()) {
      if (!state.channelId) continue;
      if (state.member?.user.bot) continue;
      if (sessions.has(`${guild.id}:${state.id}`)) continue;
      startSession(guild.id, state.id);
      restored++;
    }
  }
  if (restored > 0) console.log(`[Voice] Melanjutkan tracking untuk ${restored} user yang sudah di voice.`);
  return restored;
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
};
