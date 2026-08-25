// Mendaftarkan definisi slash command ke Discord.
//
// Jalankan `npm run deploy` setiap kali nama, deskripsi, atau opsi command
// berubah. Perubahan isi/logika command tidak perlu deploy ulang.
//
// Kalau GUILD_ID diisi, command didaftarkan khusus ke server itu (langsung
// muncul, cocok untuk development). Tanpa GUILD_ID, command dipasang global
// dan penyebarannya bisa memakan waktu sampai satu jam.
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const logger = require('../src/lib/logger');

const commandsPath = path.join(__dirname, '..', 'src', 'commands');
const commands = [];

// withFileTypes + isDirectory: lewati file penjaga git seperti .nekokeep yang
// bukan folder kategori.
const categories = fs
  .readdirSync(commandsPath, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);

for (const category of categories) {
  const dir = path.join(commandsPath, category);
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const command = require(path.join(dir, file));
    if ('data' in command) commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    logger.info(`Mendaftarkan ${commands.length} command...`);

    const route = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);

    const data = await rest.put(route, { body: commands });

    logger.info(`Berhasil mendaftarkan ${data.length} command.`);
  } catch (error) {
    logger.error('Gagal mendaftarkan command:', error);
    process.exitCode = 1;
  }
})();
