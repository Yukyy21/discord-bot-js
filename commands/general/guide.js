const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guide')
    .setDescription('Lihat panduan lengkap cara pakai bot'),
  async execute(interaction) {
    const embed = baseEmbed()
      .setTitle('📖 Bot Guide')
      .setColor(0x5865f2)

      .addFields(
        {
          name: '💰 Economy',
          value: [
            '`/balance` — Cek saldo coin (dompet + bank)',
            '`/daily` — Klaim reward harian + streak',
            '`/shop` — Lihat item di toko (refresh tiap 10 menit)',
            '`/buy <id>` — Beli item dari shop',
            '`/inventory` — Lihat inventory kamu',
            '`/give @user <amount>` — Transfer coin ke user lain',
            '`/exchange <amount>` — Tukar coin jadi poin (500 coin = 1 poin)',
          ].join('\n'),
        },
        {
          name: '⭐ Points & Leveling',
          value: [
            '`/profile` — Lihat profil lengkap (card gambar)',
            '`/rank` — Lihat rank & level (card gambar)',
            '`/leaderboard balance` — Top 10 coin terbanyak',
            '`/leaderboard points` — Top 10 poin terbanyak',
            '`/leaderboard voice` — Top 10 jam voice terbanyak',
            '`/leaderboard card` — Leaderboard dalam bentuk gambar',
          ].join('\n'),
        },
        {
          name: '🎤 Voice Activity',
          value: [
            'Poin otomatis tiap 15 menit di voice channel (+5 poin)',
            'Total jam voice di-track untuk leaderboard',
            'Aktif di voice = naik level lebih cepat!',
          ].join('\n'),
        },
        {
          name: '🏆 Rank Tiers',
          value: [
            '**Novice** — Level 1+',
            '**Apprentice** — Level 6+',
            '**Adept** — Level 11+',
            '**Veteran** — Level 21+',
            '**Champion** — Level 36+',
            '**Hero** — Level 51+',
            '**Demigod** — Level 71+',
          ].join('\n'),
        },
        {
          name: '🎁 Level-up Reward',
          value: [
            'Naik level = dapat **poin** (level × 10)',
            'Naik level = dapat **coin** (level × 50)',
            'Naik level = kesempatan **random item** dari shop',
          ].join('\n'),
        },
        {
          name: 'ℹ️ Tips',
          value: [
            'Chat di channel yang ditentukan = naik XP + poin',
            'Voice channel = poin otomatis tiap 15 menit',
            'Shop refresh tiap 10 menit, jangan sampai kehabisan!',
            'Semakin tinggi level, semakin besar reward',
          ].join('\n'),
        },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
