const { SlashCommandBuilder } = require('discord.js');
const { bestStaff, currentYearMonth, listStaff } = require('../../database');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// Pilihan bulan untuk argumen `bulan`. Dibangun dari bulan sekarang sampai
// 2 bulan ke belakang, supaya histori bulan lalu tetap bisa dilihat.
function monthChoices() {
  const choices = [];
  const year = new Date().getFullYear();
  const month = new Date().getMonth(); // 0-based
  for (let back = 0; back < 3; back++) {
    const d = new Date(year, month - back, 1);
    choices.push({
      name: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    });
  }
  return choices;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('best-staff-of-the-month')
    .setDescription('Staff terbaik bulan ini (4 metrik, bobot sama rata)')
    .addStringOption(o =>
      o.setName('bulan').setDescription('Lihat bulan lain (kosongkan = bulan ini)').addChoices(...monthChoices()),
    ),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const requested = interaction.options.getString('bulan');
    const yearMonth = requested || currentYearMonth();
    const [y, m] = yearMonth.split('-').map(Number);
    const label = `${MONTHS[m - 1]} ${y}`;

    if (listStaff(guildId).length === 0) {
      return interaction.reply({ embeds: [errorEmbed('Belum ada staff di server ini.')] });
    }

    const rows = bestStaff(guildId, yearMonth);
    if (rows.length === 0) {
      return interaction.reply({
        embeds: [errorEmbed(`Belum ada aktivitas staff tercatat untuk **${label}**.`)],
      });
    }

    const medals = ['first', 'second', 'third'];
    const lines = rows.map((r, i) => {
      const medal = medals[i] ? `${e(medals[i])} ` : `${i + 1}. `;
      const stars = '⭐'.repeat(Math.max(1, Math.round(r.score * 5)));
      return `${medal}<@${r.userId}> — skor ${(r.score * 100).toFixed(1)}/100 ${stars}\n` +
        `> 💬 ${r.messageCount} · 🎤 ${r.voiceMinutes}m · 📣 ${r.tagCount} tag · 📢 ${r.announcementCount} announcemen`;
    });

    const embed = themedEmbed('leaderboard', `Staff Terbaik · ${label}`, COLORS.primary)
      .setDescription(`${e('leaderboard')} Gabungan 4 metrik (pesan, voice, tag, announcement) — bobot sama rata.\n\n${lines.join('\n\n')}`)
      .setFooter({ text: 'Skor = rata-rata tiap metrik ternormalisasi ke nilai tertinggi bulan tersebut.' });

    return interaction.reply({ embeds: [embed] });
  },
};