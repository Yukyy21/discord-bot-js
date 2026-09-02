const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getPoints, redeemPoruvItem } = require('../../database');
const { themedEmbed, errorEmbed, successEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e, eo } = require('../../lib/emojis');
const { PORUV_SHOP } = require('../../config/constants');

// Role yang membernya di-DM saat ada klaim manual baru (Owocash, e-wallet,
// custom role). Format: comma-separated role ID, isi di .env (lihat
// .env.example). Contoh: ADMIN_ROLE_IDS=123456789012345678,234567890123456789
const ADMIN_ROLE_IDS = (process.env.ADMIN_ROLE_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

/** Tombol redeem satu baris per item, dinonaktifkan kalau Poruv belum cukup. */
function buildRedeemRow(balance) {
  const row = new ActionRowBuilder();
  for (const item of PORUV_SHOP) {
    const btn = new ButtonBuilder()
      .setCustomId(`poruv_redeem:${item.key}`)
      .setLabel(`${item.name} · ${item.price.toLocaleString()}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(balance < item.price);
    const emoji = eo(item.emoji);
    if (emoji) btn.setEmoji(emoji);
    row.addComponents(btn);
  }
  return row;
}

function buildPoruvShop(userId, guildId) {
  const stats = getPoints(userId, guildId);
  const balance = stats.points;

  const lines = [
    `${e('point')} Saldo Poruv kamu: **${balance.toLocaleString()}**`,
    DIVIDER,
    `${e('warn')} Semua item di sini butuh proses manual admin — klaim masuk antrean, bukan langsung cair (kecuali item Mythic yang otomatis masuk \`/inventory\`).`,
    '',
  ];

  for (const item of PORUV_SHOP) {
    const afford = balance >= item.price ? ` ${e('success')}` : '';
    lines.push(
      `${e(item.emoji)} **${item.name}** — \`${item.price.toLocaleString()} Poruv\`${afford}`,
      `-# ${item.description}`,
    );
  }

  const embed = themedEmbed('shop', 'Poruv Shop', COLORS.points)
    .setDescription(lines.join('\n'))
    .setFooter({ text: 'Kumpulkan Poruv dari chat & voice, lalu tukar di sini' });

  return {
    embeds: [embed],
    components: [buildRedeemRow(balance)],
  };
}

/**
 * DM tiap member yang punya salah satu role di ADMIN_ROLE_IDS saat ada
 * klaim manual baru. Gagal fetch role/member atau gagal kirim DM (DM
 * ditutup, dsb) tidak membatalkan redeem — redeem sudah tercatat lebih dulu
 * di database, notifikasi ini cuma pemberitahuan tambahan.
 */
async function notifyAdmins(interaction, result) {
  if (!ADMIN_ROLE_IDS.length) return;

  const embed = themedEmbed('warn', 'Klaim Poruv Shop Baru', COLORS.warn).setDescription(
    [
      `${interaction.user} menukar **${result.item.name}** seharga **${result.item.price.toLocaleString()} Poruv**.`,
      `${e('info')} Status: \`${result.redemption.status}\``,
      result.grantedItemName
        ? `${e('success')} Item Mythic **${result.grantedItemName}** sudah otomatis masuk inventori user.`
        : `${e('warn')} Butuh tindak lanjut manual (Owocash / e-wallet / custom role).`,
    ].join('\n'),
  );

  try {
    const guild = interaction.guild;
    if (!guild) return;

    // Kumpulkan member unik dari semua role admin. Ambil dari cache role
    // dulu; kalau kosong (cache belum terisi), fetch seluruh member sekali.
    const admins = new Map();
    for (const roleId of ADMIN_ROLE_IDS) {
      let role = guild.roles.cache.get(roleId);
      if (!role) role = await guild.roles.fetch(roleId).catch(() => null);
      if (!role) continue;

      if (role.members.size === 0) await guild.members.fetch().catch(() => {});
      for (const [id, member] of role.members) admins.set(id, member);
    }

    await Promise.allSettled(
      [...admins.values()].map(member => member.send({ embeds: [embed] }).catch(() => {})),
    );
  } catch {
    // Kegagalan apa pun di sini (izin, guild tidak ditemukan, dst) tidak
    // boleh menggagalkan redeem yang sudah tercatat.
  }
}

module.exports = {
  buildPoruvShop,
  notifyAdmins,
  data: new SlashCommandBuilder()
    .setName('poruv-shop')
    .setDescription('Tukar Poruv jadi Owocash, e-wallet, custom role, atau item Mythic'),
  async execute(interaction) {
    await interaction.reply(buildPoruvShop(interaction.user.id, interaction.guildId));
  },
  async handleRedeem(interaction, itemKey) {
    const result = redeemPoruvItem(interaction.user.id, interaction.guildId, itemKey);
    if (!result.ok) {
      return interaction.reply({ embeds: [errorEmbed(result.message)], flags: MessageFlags.Ephemeral });
    }

    const embed = successEmbed('Klaim Berhasil', result.message);
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    await interaction.message
      .edit(buildPoruvShop(interaction.user.id, interaction.guildId))
      .catch(() => {});
    await notifyAdmins(interaction, result);
  },
};
