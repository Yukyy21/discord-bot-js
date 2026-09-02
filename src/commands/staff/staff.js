const { SlashCommandBuilder } = require('discord.js');
const { listStaff } = require('../../database');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { paginate, pagerRow } = require('../../ui/pager');

// Daftar staff aktif, dikelompokkan per divisi. Dipakai command ini dan
// tombol `staff_page` di interactionCreate.js (state tersimpan di customId).
function buildStaff(guildId, page = 0) {
  const groups = listStaff(guildId);
  if (groups.length === 0) return { embeds: [errorEmbed('Belum ada staff di server ini.')], components: [] };

  const { slice, totalPages } = paginate(groups, page, 5);
  const embed = themedEmbed('person', 'Staff', COLORS.primary)
    .setDescription(`${e('person')} Staff aktif di server ini. Rating diisi via \`/staff-rating\`.`)
    .addFields(
      slice.map(g => {
        const lines = g.members.map(m => {
          const stars = m.ratingAvg ? ` ${'⭐'.repeat(Math.round(m.ratingAvg))} (${m.ratingAvg})` : '';
          const desc = m.deskripsi ? `\n\u200b ${m.deskripsi}` : '';
          return `<@${m.userId}>${stars}${desc}`;
        });
        return { name: `${e('person')} ${g.divisi}`, value: lines.join('\n') };
      }),
    )
    .setFooter({ text: `Halaman ${page + 1}/${totalPages} • Staff diatur via /staff-set (admin)` });

  return { embeds: [embed], components: pagerRow('staff_page', page, totalPages) };
}

module.exports = {
  buildStaff,
  data: new SlashCommandBuilder().setName('staff').setDescription('Lihat daftar staff aktif di server ini'),
  async execute(interaction) {
    await interaction.reply(buildStaff(interaction.guildId, 0));
  },
};