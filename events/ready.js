const { restoreVoiceTracking } = require('./voiceStateUpdate');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`Logged in sebagai ${client.user.tag} di ${client.guilds.cache.size} server!`);
    restoreVoiceTracking(client);
  },
};
