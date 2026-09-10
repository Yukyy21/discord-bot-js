const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { themedEmbed, successEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const log = require('../../lib/logger').scope('Report');

// Role yang membernya di-DM tiap ada laporan baru. Dipakai bersama
// /poruv-shop (lihat ADMIN_ROLE_IDS di poruvShop.js) — satu variabel env
// yang sama untuk semua notifikasi "butuh perhatian admin".
const ADMIN_ROLE_IDS = (process.env.ADMIN_ROLE_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

const TYPE_LABEL = {
  bug: { title: 'Laporan Bug', emoji: 'warn', color: COLORS.warn },
  saran: { title: 'Saran Baru', emoji: 'idea', color: COLORS.info },
};

/** DM tiap member yang punya salah satu role di ADMIN_ROLE_IDS. Gagal diam-diam kalau env kosong/izin kurang. */
async function notifyAdmins(interaction, type, text) {
  if (!ADMIN_ROLE_IDS.length) return;
  const label = TYPE_LABEL[type];

  const embed = themedEmbed(label.emoji, label.title, label.color).setDescription(
    [
      `${e('person')} Dari: ${interaction.user} (\`${interaction.user.id}\`)`,
      `${e('info')} Server: **${interaction.guild?.name ?? 'DM'}**`,
      '',
      text,
    ].join('\n'),
  );

  try {
    const guild = interaction.guild;
    if (!guild) return;

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
  } catch (error) {
    // Kegagalan apa pun di sini (izin, guild tidak ditemukan, dst) tidak
    // boleh menggagalkan laporan yang sudah diterima usernya.
    log.error('Gagal mengirim notifikasi report ke admin:', error.message);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Laporkan bug atau kasih saran soal bot')
    .addStringOption(o =>
      o
        .setName('type')
        .setDescription('Jenis laporan')
        .setRequired(true)
        .addChoices({ name: 'bug', value: 'bug' }, { name: 'saran', value: 'saran' }),
    )
    .addStringOption(o =>
      o.setName('text').setDescription('Isi laporan/saranmu').setRequired(true).setMaxLength(1000),
    ),
  async execute(interaction) {
    const type = interaction.options.getString('type');
    const text = interaction.options.getString('text');

    log.info(`${interaction.user.tag} report ${type}: ${text}`);
    await notifyAdmins(interaction, type, text);

    return interaction.reply({
      embeds: [
        successEmbed(
          'Laporan Terkirim',
          `${e('success')} Makasih! Laporan **${type}** kamu sudah kami terima.`,
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};
    
