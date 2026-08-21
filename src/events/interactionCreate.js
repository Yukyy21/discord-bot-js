const { MessageFlags } = require('discord.js');
const { errorEmbed } = require('../ui/embeds');
const { buildGuide } = require('../ui/guidePages');
const { buildShop } = require('../commands/economy/shop');
const { buildInventory } = require('../commands/economy/inventory');
const { buildLeaderboard } = require('../commands/general/leaderboard');
const { renderLeaderboardCard } = require('../cards/leaderboardCard');

// Discord membatalkan token interaksi setelah beberapa detik. Slash command
// dari sebelum bot restart pasti sudah lewat batas ini, jadi dilewati saja
// daripada memancing error 10062 di log.
const STALE_COMMAND_MS = 2500;
const UNKNOWN_INTERACTION = 10062;

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isButton()) return handleButton(interaction);
    if (interaction.isStringSelectMenu()) return handleSelectMenu(interaction);
    if (interaction.isChatInputCommand()) return handleCommand(interaction);
  },
};

/**
 * State pagination disimpan di customId dengan format `aksi:a:b`, jadi tombol
 * tetap berfungsi walau bot sudah restart (tidak ada cache di memori).
 */
async function handleButton(interaction) {
  const [action, a, b] = interaction.customId.split(':');

  try {
    switch (action) {
      case 'guide_home':
        return await interaction.update(buildGuide('home'));

      case 'guide_close':
        return await interaction.message.delete().catch(() => {});

      case 'pager_noop': // tombol indikator halaman, memang tidak melakukan apa-apa
        return;

      case 'shop_page':
        return await interaction.update(buildShop(Number(a) || 0));

      case 'inv_page': {
        // a = pemilik inventori, b = halaman
        if (a !== interaction.user.id) {
          return await interaction.reply({
            embeds: [errorEmbed('Ini inventori orang lain. Pakai `/inventory` buat lihat punyamu.')],
            flags: MessageFlags.Ephemeral,
          });
        }
        return await interaction.update(buildInventory(interaction.user, interaction.guildId, Number(b) || 0));
      }

      case 'lb_page': // a = kategori, b = halaman
        return await interaction.update(buildLeaderboard(a, interaction.guildId, Number(b) || 0));

      default:
        return;
    }
  } catch (error) {
    if (error.code === UNKNOWN_INTERACTION) return;
    console.error(`Button "${interaction.customId}" gagal:`, error);
  }
}

async function handleSelectMenu(interaction) {
  try {
    if (interaction.customId === 'guide_select') {
      return await interaction.update(buildGuide(interaction.values[0]));
    }
    if (interaction.customId === 'lb_filter') {
      return await renderLeaderboardCard(interaction, interaction.values[0]);
    }
  } catch (error) {
    if (error.code === UNKNOWN_INTERACTION) return;
    console.error(`Select menu "${interaction.customId}" gagal:`, error);
  }
}

async function handleCommand(interaction) {
  if (Date.now() - interaction.createdTimestamp > STALE_COMMAND_MS) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    if (error.code === UNKNOWN_INTERACTION) return;
    console.error(`Command /${interaction.commandName} gagal:`, error);

    const reply = {
      embeds: [errorEmbed('Terjadi error saat menjalankan command ini.')],
      flags: MessageFlags.Ephemeral,
    };
    try {
      if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
      else await interaction.reply(reply);
    } catch (replyError) {
      console.error('Gagal mengirim pesan error ke user:', replyError.message);
    }
  }
}
