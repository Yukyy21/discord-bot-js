const logger = require('../lib/logger');
const { restoreVoiceTracking } = require('./voiceStateUpdate');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    logger.info(`Login sebagai ${client.user.tag} di ${client.guilds.cache.size} server.`);
    restoreVoiceTracking(client);
  },
};
