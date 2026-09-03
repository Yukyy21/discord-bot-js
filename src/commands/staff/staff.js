const { SlashCommandBuilder } = require('discord.js');
const { listStaff, getRecentComments } = require('../../database');
const { themedEmbed, errorEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { paginate, pagerRow } = require('../../ui/pager');

/** Ratakan hasil listStaff (dikelompokkan per divisi) jadi 1 daftar urut. */
function flattenStaff(guildId) {
  return listStaff(guildId).flatMap(g => g.members.map(m => ({ ...m, divisi: g.divisi })));
}

/** Render rating jadi baris bintang terisi/kosong + angka, atau pesan "belum ada". */
function ratingLine(member) {
  if (!member.ratingAvg) return `${e('star_rating')} Belum ada rating — jadi yang pertama lewat \`/staff-rating\`.`;
  const filled = Math.round(member.ratingAvg);
  const stars = e('star_rating').repeat(filled) + '☆'.repeat(5 - filled);
  const label = member.ratingCount === 1 ? '1 rating' : `${member.ratingCount} rating`;
  return `${stars} **${member.ratingAvg}**/5 · ${label}`;
}

/** Baris kutipan 1-3 komentar terbaru, atau array kosong kalau belum ada. */
function commentLines(member, guildId) {
  const comments = getRecentComments(member.userId, guildId, 3);
  if (comments.length === 0) return [];
  return [
    '',
    '**Komentar terbaru**',
    ...comments.map(c => `> ${e('star_rating').repeat(c.stars)} <@${c.raterUserId}>: *${c.comment}*`),
  ];
}

/**
 * Satu staff per halaman: divisi & posisi di judul, deskripsi, rating, dan
 * komentar terbaru. Dipakai command ini dan tombol `staff_page` di
 * interactionCreate.js (state tersimpan di customId).
 */
async function buildStaff(client, guildId, page = 0) {
  const all = flattenStaff(guildId);
  if (all.length === 0) return { embeds: [errorEmbed('Belum ada staff di server ini.')], components: [] };

  const { slice, page: current, totalPages } = paginate(all, page, 1);
  const member = slice[0];
  const user = await client.users.fetch(member.userId).catch(() => null);

  const embed = themedEmbed('staff', `Staff — ${member.divisi}`, COLORS.primary)
    .setDescription(
      [
        `${e('staff')} <@${member.userId}>`,
        DIVIDER,
        member.deskripsi || '_Belum ada deskripsi._',
        '',
        ratingLine(member),
        ...commentLines(member, guildId),
      ].join('\n'),
    )
    .setFooter({
      text: `Staff ${current + 1}/${totalPages} • Nilai lewat /staff-rating • diatur via /staff-set (admin)`,
    });

  if (user) embed.setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }));

  return { embeds: [embed], components: pagerRow('staff_page', current, totalPages) };
}

module.exports = {
  buildStaff,
  data: new SlashCommandBuilder().setName('staff').setDescription('Lihat daftar staff aktif di server ini'),
  async execute(interaction) {
    await interaction.reply(await buildStaff(interaction.client, interaction.guildId, 0));
  },
};
