const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { addStaff, removeStaff } = require('../../database');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');

// Kelola daftar staff per-guild. Daftar ini diisi manual — bukan diturunkan
// dari role Discord — jadi /staff hanya menampilkan yang didaftarkan di sini.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff-set')
    .setDescription('Kelola daftar staff di server ini (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc =>
      sc
        .setName('add')
        .setDescription('Tambah user sebagai staff')
        .addUserOption(o => o.setName('user').setDescription('User yang mau dijadikan staff').setRequired(true))
        .addStringOption(o => o.setName('divisi').setDescription('Divisi/tim (mis. Moderator)').setRequired(true))
        .addStringOption(o => o.setName('deskripsi').setDescription('Deskripsi singkat (opsional)')),
    )
    .addSubcommand(sc =>
      sc
        .setName('remove')
        .setDescription('Hapus user dari daftar staff')
        .addUserOption(o => o.setName('user').setDescription('User yang mau dihapus').setRequired(true)),
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user');
    const userId = target.id;
    const guildId = interaction.guildId;

    if (sub === 'add') {
      const divisi = interaction.options.getString('divisi');
      const deskripsi = interaction.options.getString('deskripsi');
      const result = addStaff(userId, guildId, divisi, deskripsi, interaction.user.id);
      if (!result.ok) {
        return interaction.reply({ embeds: [errorEmbed(result.message)], flags: MessageFlags.Ephemeral });
      }
      const embed = themedEmbed('staff', 'Staff Ditambahkan', COLORS.success)
        .setDescription(
          `${e('staff')} **${target.username}** sekarang staff di server ini.`,
        )
        .addFields(
          { name: 'Divisi', value: divisi, inline: true },
          { name: 'Deskripsi', value: deskripsi || '—', inline: true },
        );
      return interaction.reply({ embeds: [embed] });
    }

    const result = removeStaff(userId, guildId);
    if (!result.ok) {
      return interaction.reply({ embeds: [errorEmbed(result.message)], flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({
      embeds: [
        themedEmbed('staff', 'Staff Dihapus', COLORS.economy).setDescription(
          `${e('staff')} **${target.username}** sudah dihapus dari daftar staff.`,
        ),
      ],
    });
  },
};