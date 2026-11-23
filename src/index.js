require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const logger = require('./lib/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // wajib untuk hitung kata dari isi pesan
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

/** Muat semua file command dari commands/<kategori>/<nama>.js. */
function loadCommands() {
  const root = path.join(__dirname, 'commands');
  // withFileTypes + isDirectory: folder kategori bisa berisi file penjaga git
  // seperti .nekokeep yang bukan direktori dan harus dilewati.
  const categories = fs
    .readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  for (const category of categories) {
    const dir = path.join(root, category);
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
      const command = require(path.join(dir, file));
      // File seperti shop.js juga mengekspor builder untuk tombol pagination,
      // jadi hanya yang punya data + execute yang didaftarkan sebagai command.
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
      }
    }
  }
}

/** Daftarkan tiap file di events/ ke listener client dengan nama event-nya. */
function loadEvents() {
  const dir = path.join(__dirname, 'events');
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const event = require(path.join(dir, file));
    if (!event.name) continue;
    const handler = (...args) => event.execute(...args, client);
    if (event.once) client.once(event.name, handler);
    else client.on(event.name, handler);
  }
}

// Bot harus tetap hidup walau ada error yang lolos; kalau proses mati,
// tracking voice yang tersimpan di memori ikut hilang.
client.on('error', error => logger.error('Client error:', error));
process.on('unhandledRejection', error => logger.error('Unhandled rejection:', error));
process.on('uncaughtException', error => logger.error('Uncaught exception:', error));

loadCommands();
loadEvents();

client.once('clientReady', () => {
  try {
    const { profileLevelConfig, createProfileLevelServer } = require('./lib/profileLevelApi');
    const config = profileLevelConfig();
    if (!config) return;
    const server = createProfileLevelServer({
      ...config,
      getLevel: (userId, guildId) => require('./database').getProfileLevel(userId, guildId),
      hasGuild: guildId => client.isReady() && client.guilds.cache.has(guildId),
      renderPreview: (body, signal) => require('./lib/profilePreview').renderProfilePreview(body, {
        db: require('./database/connection').db, client, signal,
      }),
    });
    server.on('error', () => logger.error('Profile level API unavailable'));
    server.listen(config.port, config.host);
  } catch { logger.error('Profile level API disabled: invalid configuration'); }
});

client.login(process.env.DISCORD_TOKEN);
