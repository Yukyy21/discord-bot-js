const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { listStaff, getRecentRatings } = require('../../database');
const { errorEmbed } = require('../../ui/embeds');
const { paginate, pagerRow } = require('../../ui/pager');
const { buildStaffCard } = require('../../cards/staffCard');

/** Ratakan hasil listStaff (dikelompokkan & diurut per divisi) jadi 1 daftar urut. */
function flattenStaff(guildId) {
  return listStaff(guildId).flatMap(g => g.members.map(m => ({ ...m, divisi: g.divisi })));
}

/**
 * Satu staff per halaman, digambar sebagai kartu PNG (avatar, divisi, rating
 * rata-rata, deskripsi, 5 rating terbaru) — bukan embed teks lagi. Dipakai
 * command ini dan tombol `staff_page` di interactionCreate.js (state halaman
 * tersimpan di customId tombol).
 */
async function buildStaff(client, guildId, page = 0) {
  const all = flattenStaff(guildId);
  if (all.length === 0) return { embeds: [errorEmbed('Belum ada staff di server ini.')], components: [] };

  const { slice, page: current, totalPages } = paginate(all, page, 1);
  const member = slice[0];
  const user = await client.users.fetch(member.userId).catch(() => null);

  const ratings = getRecentRatings(member.userId, guildId, 5);
  const raters = await Promise.all(ratings.map(r => client.users.fetch(r.raterUserId).catch(() => null)));
  const recentRatings = ratings.map((r, i) => ({
    stars: r.stars,
    comment: r.comment,
    raterName: raters[i]?.displayName ?? raters[i]?.username ?? 'Member',
  }));

  const buffer = await buildStaffCard({
    avatar: user?.displayAvatarURL({ extension: 'png', size: 256 }) ?? null,
    username: user?.displayName ?? user?.username ?? `User ${member.userId}`,
    divisi: member.divisi,
    deskripsi: member.deskripsi,
    ratingAvg: member.ratingAvg,
    ratingCount: member.ratingCount,
    addedAt: member.addedAt,
    recentRatings,
    page: current,
    totalPages,
  });

  const file = new AttachmentBuilder(buffer, { name: 'staff.png' });
  return { files: [file], components: pagerRow('staff_page', current, totalPages) };
}

module.exports = {
  buildStaff,
  data: new SlashCommandBuilder().setName('staff').setDescription('Lihat daftar staff aktif di server ini'),
  async execute(interaction) {
    await interaction.deferReply();
    await interaction.editReply(await buildStaff(interaction.client, interaction.guildId, 0));
  },
};
