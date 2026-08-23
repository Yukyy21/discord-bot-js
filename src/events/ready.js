const { restoreVoiceTracking } = require('./voiceStateUpdate');
const { clearExpiredBuffs } = require('../database');

// Sapu buff kadaluarsa tiap 10 menit supaya tabel user_buffs tidak menumpuk.
const BUFF_CLEANUP_MS = 10 * 60 * 1000;

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`Login sebagai ${client.user.tag} di ${client.guilds.cache.size} server.`);
    restoreVoiceTracking(client);
    clearExpiredBuffs();
    setInterval(clearExpiredBuffs, BUFF_CLEANUP_MS);
  },
};
