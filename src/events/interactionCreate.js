const { MessageFlags } = require('discord.js');
const { errorEmbed, warnEmbed } = require('../ui/embeds');
const logger = require('../lib/logger');
const { claimQuest } = require('../database');
const { buildGuide } = require('../ui/guidePages');
const { buildShop } = require('../commands/economy/shop');
const { buildInventory } = require('../commands/economy/inventory');
const { buildQuest } = require('../commands/economy/quest');
const { buildLeaderboard } = require('../commands/general/leaderboard');
const { buildCredit } = require('../commands/general/credit');
const { buildStaff } = require('../commands/staff/staff');
const poruvShopCmd = require('../commands/economy/poruvShop');
const { renderLeaderboardCard } = require('../cards/leaderboardCard');
const { handleBossAttack } = require('../lib/bossManager');

// Discord membatalkan token interaksi setelah beberapa detik. Slash command
// dari sebelum bot restart pasti sudah lewat batas ini, jadi dilewati saja
// daripada memancing error 10062 di log.
const STALE_COMMAND_MS = 2500;
const UNKNOWN_INTERACTION = 10062;
const ALREADY_ACKNOWLEDGED = 40060;

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
  const [action, a, b, c] = interaction.customId.split(':');

  try {
    switch (action) {
      case 'guide_home':
        return await interaction.update(buildGuide('home'));

      case 'guide_close':
        return await interaction.message.delete().catch(() => {});

      case 'pager_noop': // tombol indikator halaman, memang tidak melakukan apa-apa
        return;

      case 'shop_page': {
        // Format baru: shop_page:<tier>:<kata kunci>:<halaman> — filter ikut
        // tersimpan di customId. Tombol lama (shop_page:<halaman>) tetap jalan.
        const viewer = { userId: interaction.user.id, guildId: interaction.guildId };
        if (c === undefined) return await interaction.update(buildShop(Number(a) || 0, {}, viewer));
        return await interaction.update(buildShop(Number(c) || 0, { tier: a, query: b || '' }, viewer));
      }

      case 'inv_page': {
        // a = pemilik inventori, b = halaman
        if (a !== interaction.user.id) {
          return await interaction.reply({
            embeds: [errorEmbed('Ini inventori orang lain. Pakai `/inventory` buat lihat punyamu.')],
            flags: MessageFlags.Ephemeral,
          });
        }
        return await interaction.update(
          buildInventory(interaction.user, interaction.guildId, Number(b) || 0),
        );
      }

      case 'quest_claim': {
        // Format: quest_claim:<pemilik>:<periode>:<id quest>. Periode mengandung
        // ':' juga (daily:2026-08-23), jadi pecah dari kanan — id quest paling
        // belakang, sisanya antara pemilik dan quest adalah periode utuh.
        const parts = interaction.customId.split(':');
        if (parts[1] !== interaction.user.id) {
          return await interaction.reply({
            embeds: [errorEmbed('Ini quest orang lain. Pakai `/quest` buat lihat punyamu.')],
            flags: MessageFlags.Ephemeral,
          });
        }
        const questId = parts.pop();
        const period = parts.slice(2).join(':');
        const result = claimQuest(interaction.user.id, interaction.guildId, period, questId);
        if (!result.ok) {
          return await interaction.reply({
            embeds: [warnEmbed(result.message)],
            flags: MessageFlags.Ephemeral,
          });
        }
        // Render ulang: tombol yang sudah diklaim hilang, sisa quest tetap.
        return await interaction.update(buildQuest(interaction.user, interaction.guildId));
      }

      case 'boss_attack': // a = id boss di tabel boss_spawns
        return await handleBossAttack(interaction, a);

      case 'lb_page': // a = kategori, b = halaman
        return await interaction.update(buildLeaderboard(a, interaction.guildId, Number(b) || 0));

      case 'credit_page': // a = halaman
        return await interaction.update(buildCredit(Number(a) || 0));

      case 'staff_page': // a = halaman
        return await interaction.update(buildStaff(interaction.guildId, Number(a) || 0));

      case 'poruv_redeem': // a = item key
        return await poruvShopCmd.handleRedeem(interaction, a);

      default:
        return;
    }
  } catch (error) {
    if (error.code === UNKNOWN_INTERACTION || error.code === ALREADY_ACKNOWLEDGED) return;
    logger.error(`Button "${interaction.customId}" gagal:`, error);
  }
}

async function handleSelectMenu(interaction) {
  try {
    if (interaction.customId === 'guide_select') {
      return await interaction.update(buildGuide(interaction.values[0]));
    }
    if (interaction.customId.startsWith('shop_tier:')) {
      const query = interaction.customId.slice('shop_tier:'.length);
      const tier = interaction.values[0] === 'all' ? '' : interaction.values[0];
      return await interaction.update(
        buildShop(
          0,
          { tier, query },
          {
            userId: interaction.user.id,
            guildId: interaction.guildId,
          },
        ),
      );
    }
    if (interaction.customId === 'lb_filter') {
      return await renderLeaderboardCard(interaction, interaction.values[0]);
    }
  } catch (error) {
    if (error.code === UNKNOWN_INTERACTION || error.code === ALREADY_ACKNOWLEDGED) return;
    logger.error(`Select menu "${interaction.customId}" gagal:`, error);
  }
}

async function handleCommand(interaction) {
  if (Date.now() - interaction.createdTimestamp > STALE_COMMAND_MS) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    if (error.code === UNKNOWN_INTERACTION || error.code === ALREADY_ACKNOWLEDGED) return;
    logger.error(`Command /${interaction.commandName} gagal:`, error);

    const reply = {
      embeds: [errorEmbed('Terjadi error saat menjalankan command ini.')],
      flags: MessageFlags.Ephemeral,
    };
    try {
      if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
      else await interaction.reply(reply);
    } catch (replyError) {
      if (replyError.code !== ALREADY_ACKNOWLEDGED) {
        logger.error('Gagal mengirim pesan error ke user:', replyError.message);
      }
    }
  }
}
