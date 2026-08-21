const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { SlashCommandBuilder, version: djsVersion } = require('discord.js');
const { themedEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { DATA_DIR } = require('../../lib/paths');

const pkg = require('../../../package.json');

/** Versi dependency dari package.json bot (tanpa penanda ^ / ~). */
function dep(name) {
  const raw = pkg.dependencies?.[name] ?? '-';
  return raw.replace(/^[^\d]*/, '');
}

/** Detik -> "2h 13m 5s"; bagian nol dilewati supaya ringkas. */
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
}

/** Ukuran file database, '-' kalau file belum dibuat. */
function dbSize() {
  try {
    const file = path.join(DATA_DIR, 'economy.db');
    return `${(fs.statSync(file).size / 1024 / 1024).toFixed(2)} MB`;
  } catch {
    return '-';
  }
}

module.exports = {
  formatUptime,
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Informasi teknis dan statistik bot'),
  async execute(interaction) {
    const { client } = interaction;
    const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const users = client.guilds.cache.reduce((sum, g) => sum + (g.memberCount || 0), 0);

    const embed = themedEmbed('info', 'Informasi Bot', COLORS.info)
      .setThumbnail(client.user?.displayAvatarURL({ size: 256 }) ?? null)
      .setDescription([
        `${e('developer')} **${client.user?.username ?? pkg.name}** \`v${pkg.version}\``,
        `-# ${pkg.description}`,
        DIVIDER,
      ].join('\n'))
      .addFields(
        {
          name: `${e('nodejs')} Runtime`,
          value: `Node.js \`${process.version}\`\n-# ${os.platform()} · ${process.arch}`,
          inline: true,
        },
        {
          name: `${e('discordjs')} Library`,
          value: `discord.js \`v${djsVersion}\`\n-# API v10`,
          inline: true,
        },
        {
          name: `${e('database')} Database`,
          value: `SQLite3 \`v${dep('better-sqlite3')}\`\n-# better-sqlite3 · ${dbSize()}`,
          inline: true,
        },
        {
          name: `${e('clock')} Uptime`,
          value: `**${formatUptime(process.uptime())}**`,
          inline: true,
        },
        {
          name: `${e('ping')} Latency`,
          value: `**${Math.max(client.ws.ping, 0)}ms**`,
          inline: true,
        },
        {
          name: `${e('point')} Memori`,
          value: `**${memory} MB**`,
          inline: true,
        },
        {
          name: `${e('home')} Server`,
          value: `**${client.guilds.cache.size}**`,
          inline: true,
        },
        {
          name: `${e('person')} Member`,
          value: `**${users.toLocaleString()}**`,
          inline: true,
        },
        {
          name: `${e('guide')} Command`,
          value: `**${client.commands?.size ?? 0}**`,
          inline: true,
        },
      )
      .setFooter({ text: 'Lihat /credit untuk tim pengembang' });

    await interaction.reply({ embeds: [embed] });
  },
};
