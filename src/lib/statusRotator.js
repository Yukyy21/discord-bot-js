// Rotasi status bot (Custom Activity) tiap beberapa detik. Discord tidak
// merender custom emoji (<:nama:id>) di teks status — cuma tampil sebagai
// teks mentah — jadi semua status di sini pakai emoji unicode biasa.
const { ActivityType } = require('discord.js');
const { STATUS } = require('../config/constants');
const { get: getStat } = require('../database');

/** Total member manusia (bukan bot) di semua guild yang bot ikuti. */
function totalMembers(client) {
  return client.guilds.cache.reduce((sum, guild) => sum + (guild.memberCount ?? 0), 0);
}

/** Daftar status yang dirotasi, dievaluasi ulang tiap giliran biar datanya segar. */
function buildStatuses(client) {
  const commandsUsed = getStat('commands_used');
  return [
    `👨‍💻 Develop by @Nekomaru & @Ferr`,
    `👤 ${totalMembers(client).toLocaleString('id-ID')} total member ruv`,
    `🟢 Status: online ${client.ws.ping >= 0 ? `${client.ws.ping}ms` : '...'}`,
    `🌐 ${STATUS.SERVER_INVITE}`,
    `🔝 Roblox Universal On Top!`,
    `⌨️ ${commandsUsed.toLocaleString('id-ID')} command telah digunakan`,
  ];
}

/** Jeda acak di rentang MIN_INTERVAL_MS..MAX_INTERVAL_MS biar tidak monoton. */
function randomInterval() {
  const { MIN_INTERVAL_MS, MAX_INTERVAL_MS } = STATUS;
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

/** Mulai rotasi status. Dipanggil sekali dari ready.js. */
function startStatusRotator(client) {
  let index = 0;

  function tick() {
    const statuses = buildStatuses(client);
    const text = statuses[index % statuses.length];
    index += 1;

    client.user.setPresence({
      activities: [{ name: text, type: ActivityType.Custom, state: text }],
      status: 'online',
    });

    setTimeout(tick, randomInterval());
  }

  tick();
}

module.exports = { startStatusRotator };
