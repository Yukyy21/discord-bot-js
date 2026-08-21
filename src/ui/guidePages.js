// Halaman-halaman /guide. Dipisah dari command supaya bisa dipakai ulang
// oleh handler select menu & button di events/interactionCreate.js.
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { baseEmbed, COLORS } = require('./embeds');
const { e, eo } = require('../lib/emojis');

const line = '─────────────────────────────';

const PAGES = {
  home: {
    label: 'Beranda',
    emoji: 'home',
    description: 'Ringkasan singkat semua fitur bot',
    build: () =>
      baseEmbed()
        .setColor(COLORS.primary)
        .setTitle(`${e('guide')} Panduan Bot`)
        .setDescription(
          [
            'Pilih kategori di menu bawah buat lihat detailnya.',
            line,
            `${e('coin')} **Ekonomi** — saldo, daily, shop, inventory, transfer`,
            `${e('point')} **Poin & Level** — profil, rank, leaderboard`,
            `${e('voice')} **Aktivitas** — cara dapat poin dari chat & voice`,
            `${e('leaderboard')} **Rank Tier** — daftar tier dan syarat levelnya`,
            `${e('daily')} **Reward** — hadiah tiap naik level`,
            `${e('info')} **Tips** — cara naik cepat`,
          ].join('\n'),
        ),
  },

  economy: {
    label: 'Ekonomi',
    emoji: 'coin',
    description: 'Coin, daily, shop, inventory, transfer',
    build: () =>
      baseEmbed()
        .setColor(COLORS.warn)
        .setTitle(`${e('coin')} Ekonomi`)
        .setDescription('Semua yang berhubungan sama coin kamu.')
        .addFields(
          {
            name: 'Saldo & Harian',
            value: [
              `${e('bank')} \`/balance\` — cek dompet + bank`,
              `${e('daily')} \`/daily\` — klaim reward harian, streak makin lama makin gede`,
              `${e('bank')} \`/bank deposit|withdraw <jumlah>\` — simpan / ambil coin dari bank`,
            ].join('\n'),
          },
          {
            name: 'Belanja',
            value: [
              `${e('shop')} \`/shop\` — lihat stok toko (refresh tiap 10 menit)`,
              `${e('buy')} \`/buy <id>\` — beli item`,
              `${e('inventory')} \`/inventory\` — isi tas kamu`,
              `${e('xp')} \`/use <id>\` — pakai item yang punya efek`,
            ].join('\n'),
          },
          {
            name: 'Transfer & Tukar',
            value: [
              `${e('give')} \`/give @user <jumlah>\` — kirim coin ke teman`,
              `${e('exchange')} \`/exchange <jumlah>\` — 500 coin jadi 1 poin`,
            ].join('\n'),
          },
        ),
  },

  points: {
    label: 'Poin & Level',
    emoji: 'point',
    description: 'Profil, rank, dan leaderboard',
    build: () =>
      baseEmbed()
        .setColor(COLORS.info)
        .setTitle(`${e('point')} Poin & Leveling`)
        .addFields(
          {
            name: 'Kartu Kamu',
            value: [
              `${e('profile')} \`/profile\` — kartu profil lengkap`,
              `${e('rank')} \`/rank\` — kartu rank + progress level`,
              `${e('point')} \`/points\` — rincian poin kamu`,
            ].join('\n'),
          },
          {
            name: 'Leaderboard',
            value: [
              `${e('first')} \`/leaderboard balance\` — coin terbanyak`,
              `${e('second')} \`/leaderboard points\` — poin terbanyak`,
              `${e('third')} \`/leaderboard voice\` — jam voice terbanyak`,
              `${e('leaderboard')} \`/leaderboard card\` — versi gambar`,
            ].join('\n'),
          },
        ),
  },

  activity: {
    label: 'Aktivitas',
    emoji: 'voice',
    description: 'Dapat poin dari chat & voice',
    build: () =>
      baseEmbed()
        .setColor(COLORS.success)
        .setTitle(`${e('voice')} Aktivitas`)
        .addFields(
          {
            name: 'Chat',
            value: [
              `${e('chat')} Tiap pesan di channel yang diizinkan nambah XP + poin`,
              `${e('xp')} XP nentuin level, level nentuin tier rank`,
            ].join('\n'),
          },
          {
            name: 'Voice',
            value: [
              `${e('clock')} Tiap 15 menit di voice = **+5 poin**`,
              `${e('voice')} Total durasi voice dicatat buat leaderboard`,
            ].join('\n'),
          },
        ),
  },

  tiers: {
    label: 'Rank Tier',
    emoji: 'leaderboard',
    description: 'Daftar tier dan level minimalnya',
    build: () =>
      baseEmbed()
        .setColor(COLORS.primary)
        .setTitle(`${e('leaderboard')} Rank Tier`)
        .setDescription(
          [
            `${e('tier_novice')} **Novice** — Level 1+`,
            `${e('tier_apprentice')} **Apprentice** — Level 6+`,
            `${e('tier_adept')} **Adept** — Level 11+`,
            `${e('tier_veteran')} **Veteran** — Level 21+`,
            `${e('tier_champion')} **Champion** — Level 36+`,
            `${e('tier_hero')} **Hero** — Level 51+`,
            `${e('tier_demigod')} **Demigod** — Level 71+`,
          ].join('\n'),
        ),
  },

  rewards: {
    label: 'Reward',
    emoji: 'daily',
    description: 'Hadiah naik level & daily streak',
    build: () =>
      baseEmbed()
        .setColor(COLORS.warn)
        .setTitle(`${e('daily')} Reward`)
        .addFields(
          {
            name: 'Naik Level',
            value: [
              `${e('point')} Poin: level × 10`,
              `${e('coin')} Coin: level × 50`,
              `${e('inventory')} Peluang dapat item random dari shop`,
            ].join('\n'),
          },
          {
            name: 'Daily',
            value: `${e('streak')} Klaim tiap hari tanpa bolong buat jaga streak`,
          },
        ),
  },

  tips: {
    label: 'Tips',
    emoji: 'info',
    description: 'Cara naik level dengan cepat',
    build: () =>
      baseEmbed()
        .setColor(COLORS.info)
        .setTitle(`${e('info')} Tips`)
        .setDescription(
          [
            `${e('arrow')} Ngobrol tiap hari — XP kecil tapi konsisten paling cepat`,
            `${e('arrow')} Nongkrong di voice sambil kerja, poin jalan sendiri`,
            `${e('arrow')} Cek \`/shop\` tiap 10 menit, item bagus cepat habis`,
            `${e('arrow')} Simpan coin di bank biar aman`,
            `${e('arrow')} Kalau poin kurang, tukar coin pakai \`/exchange\``,
          ].join('\n'),
        ),
  },
};

function buildComponents(active = 'home') {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('guide_select')
    .setPlaceholder('Pilih kategori panduan...')
    .addOptions(
      Object.entries(PAGES).map(([key, page]) => {
        const opt = new StringSelectMenuOptionBuilder()
          .setLabel(page.label)
          .setDescription(page.description)
          .setValue(key)
          .setDefault(key === active);
        const emoji = eo(page.emoji);
        if (emoji) opt.setEmoji(emoji);
        return opt;
      }),
    );

  const homeBtn = new ButtonBuilder()
    .setCustomId('guide_home')
    .setLabel('Beranda')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(active === 'home');
  const homeEmoji = eo('home');
  if (homeEmoji) homeBtn.setEmoji(homeEmoji);

  const closeBtn = new ButtonBuilder()
    .setCustomId('guide_close')
    .setLabel('Tutup')
    .setStyle(ButtonStyle.Danger);
  const closeEmoji = eo('error');
  if (closeEmoji) closeBtn.setEmoji(closeEmoji);

  return [
    new ActionRowBuilder().addComponents(menu),
    new ActionRowBuilder().addComponents(homeBtn, closeBtn),
  ];
}

function buildGuide(page = 'home') {
  const key = PAGES[page] ? page : 'home';
  return { embeds: [PAGES[key].build()], components: buildComponents(key) };
}

module.exports = { PAGES, buildGuide, buildComponents };
