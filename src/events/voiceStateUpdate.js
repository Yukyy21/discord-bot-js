const { addPoints, addVoiceSeconds } = require('../database');
const { VOICE } = require('../config/constants');

// Sesi voice yang sedang berjalan, key-nya `guildId:userId`.
// Sengaja disimpan di memori: kalau bot restart, sesi dibangun ulang lewat
// restoreVoiceTracking() dari daftar member yang saat itu ada di voice.
const sessions = new Map();

function startSession(guildId, userId) {
  const now = Date.now();
  sessions.set(`${guildId}:${userId}`, { userId, guildId, joinedAt: now, lastGrant: now });
}

/** Bayar sisa poin yang belum sempat dibagi, lalu catat total durasinya. */
function endSession(guildId, userId) {
  const key = `${guildId}:${userId}`;
  const session = sessions.get(key);
  if (!session) return;

  const chunks = Math.floor((Date.now() - session.lastGrant) / VOICE.INTERVAL_MS);
  if (chunks > 0) addPoints(userId, session.guildId, chunks * VOICE.POINTS_PER_INTERVAL);

  const seconds = Math.floor((Date.now() - session.joinedAt) / 1000);
  if (seconds > 0) addVoiceSeconds(userId, session.guildId, seconds);

  sessions.delete(key);
}

// Pembagi poin berkala untuk yang masih betah di voice.
setInterval(() => {
  const now = Date.now();
  for (const session of sessions.values()) {
    if (now - session.lastGrant < VOICE.INTERVAL_MS) continue;
    addPoints(session.userId, session.guildId, VOICE.POINTS_PER_INTERVAL);
    session.lastGrant = now;
  }
}, VOICE.INTERVAL_MS);

/**
 * Dipanggil sekali saat bot siap. Tanpa ini, orang yang sudah duduk di voice
 * sebelum bot menyala tidak akan dapat poin sampai dia keluar-masuk lagi.
 */
function restoreVoiceTracking(client) {
  let restored = 0;
  for (const guild of client.guilds.cache.values()) {
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

    const guildId = (newState.guild || oldState.guild).id;
    const wasInVoice = oldState.channelId !== null;
    const nowInVoice = newState.channelId !== null;

    // Pindah antar channel tidak memutus sesi, jadi hanya join & leave yang diproses.
    if (!wasInVoice && nowInVoice) startSession(guildId, member.id);
    else if (wasInVoice && !nowInVoice) endSession(guildId, member.id);
  },
  restoreVoiceTracking,
};
