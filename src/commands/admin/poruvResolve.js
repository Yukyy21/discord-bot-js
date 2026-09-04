const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const {
  getPendingRedemptions,
  resolveRedemption,
} = require('../../database');
const { themedEmbed, successEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const log = require('../../lib/logger').scope('PoruvResolve');

/**
 * Buat embed daftar klaim Poruv Shop yang masih pending. Dipakai oleh
 * command `/poruv-resolve list` dan juga oleh handler tombol `poruv_resolve`.
 * Mengembalikan { embeds, components } — embed tanpa tombol kalau tidak ada
 * klaim pending.
 */
function buildPendingList(guildId) {
  const pending = getPendingRedemptions(guildId);
  if (!pending.length) {
    return {
      embeds: [
        themedEmbed('point', 'Klaim Poruv Shop', COLORS.economy).setDescription(
          'Tidak ada klaim yang menunggu diproses.',
        ),
      ],
      components: [],
    };
  }

  const lines = pending.map(
    r =>
      `\`${r.id}\` · <@${r.userId}> · **${r.itemName}** · ${r.price.toLocaleString()} Poruv · <t:${Math.floor(r.createdAt / 1000)}:R>`,
  );

  const embed = themedEmbed('point', 'Klaim Poruv Shop — Pending', COLORS.economy)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Klik tombol untuk menandai selesai · Total: ${pending.length} klaim` });

  // Satu tombol per klaim. Kalau terlalu banyak, batasi supaya tidak melebihi
  // batas Discord (5 tombol per baris, maks 5 baris = 25 tombol).
  const buttons = pending.slice(0, 25).map(r => ({
    type: 2,
    style: 3, // Success (hijau)
    label: `${r.itemName} — ${r.userId}`,
    custom_id: `poruv_resolve:${r.id}`,
  }));

  // Susun dalam baris 5 tombol.
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push({ type: 1, components: buttons.slice(i, i + 5) });
  }

  return { embeds: [embed], components: rows };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poruv-resolve')
    .setDescription('Kelola klaim Poruv Shop manual (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc => sc.setName('list').setDescription('Tampilkan klaim pending dan tombol resolve'))
    .addSubcommand(sc =>
      sc
        .setName('resolve')
        .setDescription('Tandai klaim sebagai selesai')
        .addIntegerOption(o =>
          o.setName('id').setDescription('ID klaim dari poruv_redemptions').setRequired(true).setMinValue(1),
        ),
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
      const { embeds, components } = buildPendingList(interaction.guildId);
      return interaction.reply({ embeds, components, flags: MessageFlags.Ephemeral });
    }

    // resolve <id>
    const id = interaction.options.getInteger('id');
    const result = resolveRedemption(id, interaction.guildId);
    if (!result.ok) {
      return interaction.reply({
        embeds: [errorEmbed(result.message)],
        flags: MessageFlags.Ephemeral,
      });
    }

    const r = result.row;
    log.info(`${interaction.user.tag} resolve poruv claim #${r.id} (${r.itemName}) for <@${r.userId}>`);
    return interaction.reply({
      embeds: [
        successEmbed(
          'Klaim Diselesaikan',
          `${e('success')} Klaim **#${r.id}** — ${r.itemName} untuk <@${r.userId}> ditandai selesai.`,
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
  buildPendingList,
};
