const { addPoints, addVoiceSeconds } = require('../db/database');

const VOICE_INTERVAL_MS = 15 * 60 * 1000;
const VOICE_POINTS = 5;

const voiceTrack = new Map();

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;
    const userId = member.id;
    const guildId = (newState.guild || oldState.guild).id;
    const key = `${guildId}:${userId}`;

    const wasInVoice = oldState.channelId !== null;
    const nowInVoice = newState.channelId !== null;

    if (!wasInVoice && nowInVoice) {
      voiceTrack.set(key, { userId, guildId, joinedAt: Date.now(), lastGrant: Date.now() });
      return;
    }

    if (wasInVoice && !nowInVoice) {
      const track = voiceTrack.get(key);
      if (track) {
        const chunks = Math.floor((Date.now() - track.lastGrant) / VOICE_INTERVAL_MS);
        if (chunks > 0) addPoints(userId, track.guildId, chunks * VOICE_POINTS);
        const totalSeconds = Math.floor((Date.now() - track.joinedAt) / 1000);
        if (totalSeconds > 0) addVoiceSeconds(userId, track.guildId, totalSeconds);
        voiceTrack.delete(key);
      }
    }
  },
};

setInterval(() => {
  const now = Date.now();
  for (const [key, track] of voiceTrack) {
    if (now - track.lastGrant >= VOICE_INTERVAL_MS) {
      addPoints(track.userId, track.guildId, VOICE_POINTS);
      track.lastGrant = now;
    }
  }
}, VOICE_INTERVAL_MS);

function restoreVoiceTracking(client) {
  let count = 0;
  for (const guild of client.guilds.cache.values()) {
    for (const vs of guild.voiceStates.cache.values()) {
      if (!vs.channelId) continue;
      const member = vs.member;
      if (member && member.user.bot) continue;
      const key = `${guild.id}:${vs.id}`;
      if (!voiceTrack.has(key)) {
        voiceTrack.set(key, {
          userId: vs.id,
          guildId: guild.id,
          joinedAt: Date.now(),
          lastGrant: Date.now(),
        });
        count++;
      }
    }
  }
  if (count > 0) console.log(`[Voice] Restored tracking untuk ${count} user yang sudah di voice.`);
  return count;
}

module.exports.restoreVoiceTracking = restoreVoiceTracking;