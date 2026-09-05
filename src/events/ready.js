const logger = require('../lib/logger');
const { restoreVoiceTracking } = require('./voiceStateUpdate');
const { clearExpiredBuffs } = require('../database');
const { startBossScheduler, restoreBosses } = require('../lib/bossManager');
const { startStatusRotator } = require('../lib/statusRotator');

// Sapu buff kadaluarsa tiap 10 menit supaya tabel user_buffs tidak menumpuk.
const BUFF_CLEANUP_MS = 10 * 60 * 1000;

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    logger.info(`Login sebagai ${client.user.tag} di ${client.guilds.cache.size} server.`);
    restoreVoiceTracking(client);
    clearExpiredBuffs();
    setInterval(clearExpiredBuffs, BUFF_CLEANUP_MS);
    startStatusRotator(client);

    // Boss yang masih hidup dari sesi sebelumnya dipulihkan dulu, baru
    // penjaga jadwal spawn (jam 12 malam & 12 siang) dinyalakan.
    await restoreBosses(client).catch(error => logger.error('Gagal memulihkan boss:', error));
    startBossScheduler(client);
  },
};
