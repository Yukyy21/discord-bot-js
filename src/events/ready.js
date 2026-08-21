const { restoreVoiceTracking } = require('./voiceStateUpdate');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`Login sebagai ${client.user.tag} di ${client.guilds.cache.size} server.`);
    restoreVoiceTracking(client);
  },
};
