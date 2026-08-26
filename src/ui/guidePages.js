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
const { BOSS } = require('../config/constants');

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
            'Bot ini bikin ngobrol dan nongkrong di server jadi progres:',
            'chat & voice menghasilkan **XP** dan **poin**, coin dipakai belanja',
            'di shop yang stoknya berganti tiap 10 menit.',
            line,
            `${e('coin')} **Ekonomi** — saldo, bank, daily, shop, inventory, transfer`,
            `${e('point')} **Poin & Level** — profil, rank, leaderboard`,
            `${e('voice')} **Aktivitas** — cara dapat poin dari chat & voice`,
            `${e('quest')} **Quest** — misi harian, mingguan & bulanan berhadiah coin`,
            `${e('boss')} **Mini Boss** — boss muncul tiap 12 malam & 12 siang, serang bareng`,
            `${e('leaderboard')} **Rank Tier** — daftar tier dan syarat levelnya`,
            `${e('inventory')} **Item & Rarity** — tier item dan efek yang bisa dipakai`,
            `${e('streak')} **Reward** — hadiah tiap naik level & daily streak`,
            `${e('info')} **Utilitas** — ping, botinfo, credit`,
            `${e('warn')} **Admin** — command khusus pengelola server`,
            `${e('arrow')} **Tips** — cara naik cepat`,
          ].join('\n'),
        ),
  },

  economy: {
    label: 'Ekonomi',
    emoji: 'coin',
    description: 'Coin, bank, daily, shop, inventory, transfer',
    build: () =>
      baseEmbed()
        .setColor(COLORS.warn)
        .setTitle(`${e('coin')} Ekonomi`)
        .setDescription('Semua yang berhubungan sama coin kamu.')
        .addFields(
          {
            name: 'Saldo & Harian',
            value: [
              `${e('bank')} \`/balance\` — dompet + bank + total kekayaan`,
              `${e('daily')} \`/daily\` — klaim **500 coin** + **100 × streak** bonus`,
              `${e('streak')} Streak putus kalau lewat dari 48 jam sejak klaim terakhir`,
              `${e('bank')} \`/bank deposit <jumlah>\` — simpan coin ke bank`,
              `${e('bank')} \`/bank withdraw <jumlah>\` — ambil coin dari bank`,
            ].join('\n'),
          },
          {
            name: 'Belanja',
            value: [
              `${e('shop')} \`/shop\` — 10 item acak, refresh tiap 10 menit`,
              `${e('shop')} \`/shop tier:<Common…Mythic>\` — saring per rarity`,
              `${e('shop')} \`/shop cari:<nama>\` — cari item dari namanya`,
              `${e('buy')} \`/buy <id>\` — beli item pakai ID dari \`/shop\``,
              `${e('inventory')} \`/inventory\` — isi tas + ID item buat \`/use\``,
              `${e('ability')} \`/use <id>\` — pakai item yang punya efek`,
            ].join('\n'),
          },
          {
            name: 'Transfer & Tukar',
            value: [
              `${e('give')} \`/give <user> <amount>\` — kirim coin ke teman`,
              `${e('exchange')} \`/exchange <amount>\` — **500 coin = 1 poin**`,
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
        .setDescription(
          [
            `${e('xp')} XP naik dari chat; **level × 100 XP** untuk naik satu level`,
            `${e('point')} Poin adalah mata uang prestise — dari chat, voice, dan \`/exchange\``,
            line,
          ].join('\n'),
        )
        .addFields(
          {
            name: 'Kartu Kamu',
            value: [
              `${e('profile')} \`/profile\` — kartu profil (saldo, streak, poin, level)`,
              `${e('rank')} \`/rank\` — kartu rank + progress bar XP`,
              `${e('point')} \`/points\` — rincian poin kamu`,
            ].join('\n'),
          },
          {
            name: 'Leaderboard',
            value: [
              `${e('first')} \`/leaderboard balance\` — coin terbanyak`,
              `${e('second')} \`/leaderboard points\` — poin terbanyak`,
              `${e('third')} \`/leaderboard voice\` — jam voice terbanyak`,
              `${e('rank')} \`/leaderboard rank\` — level & rank tertinggi`,
              `${e('clock')} \`/leaderboard mingguan\` — poin yang didapat pekan ini`,
              `${e('leaderboard')} \`/leaderboard card [kategori]\` — versi gambar`,
            ].join('\n'),
          },
        ),
  },

  activity: {
    label: 'Aktivitas',
    emoji: 'voice',
    description: 'Cara dapat XP & poin dari chat dan voice',
    build: () =>
      baseEmbed()
        .setColor(COLORS.success)
        .setTitle(`${e('voice')} Aktivitas`)
        .addFields(
          {
            name: 'Chat',
            value: [
              `${e('chat')} Tiap **7 kata** = **+2 poin** (sisa kata disimpan, tidak hangus)`,
              `${e('xp')} **1 XP per kata**, maksimal **20 XP** per pesan`,
              `${e('clock')} Anti-spam: pesan dihitung paling cepat tiap **3 detik**`,
              `${e('warn')} Pesan dengan isi sama persis diabaikan selama **30 detik**`,
            ].join('\n'),
          },
          {
            name: 'Voice',
            value: [
              `${e('clock')} Tiap **15 menit** di voice = **+5 poin**`,
              `${e('voice')} Syarat: minimal **2 orang** (bukan bot, tidak deaf) di channel`,
              `${e('error')} AFK channel dan nongkrong sendirian tidak menghasilkan poin`,
              `${e('success')} Sesi voice tahan restart — bot mati tidak menghanguskan waktumu`,
            ].join('\n'),
          },
        ),
  },

  quest: {
    label: 'Quest',
    emoji: 'quest',
    description: 'Misi harian, mingguan & bulanan berhadiah coin',
    build: () =>
      baseEmbed()
        .setColor(COLORS.economy)
        .setTitle(`${e('quest')} Quest`)
        .setDescription(
          [
            `${e('quest')} \`/quest\` — lihat misi kamu; klaim lewat tombol kalau sudah penuh`,
            `${e('clock')} Tiap hari diundi **2 quest harian**, tiap pekan **1 mingguan**, tiap bulan **1 bulanan**`,
            `${e('point')} Progres dicatat otomatis — tidak perlu daftar dulu`,
            line,
          ].join('\n'),
        )
        .addFields(
          {
            name: 'Contoh Quest Harian',
            value: [
              `${e('chat')} Ngobrol 15 pesan — **400 coin**`,
              `${e('voice')} Nongkrong 30 menit di voice — **500 coin**`,
              `${e('daily')} Klaim \`/daily\` — **250 coin**`,
              `${e('xp')} Pakai satu item — **300 coin**`,
              `${e('buy')} Beli satu item di shop — **300 coin**`,
            ].join('\n'),
          },
          {
            name: 'Contoh Quest Mingguan',
            value: [
              `${e('chat')} 100 pesan — **3.000 coin**`,
              `${e('voice')} 3 jam di voice — **3.500 coin**`,
              `${e('give')} Berbagi ke teman 5 kali — **2.500 coin**`,
            ].join('\n'),
          },
        ),
  },

  boss: {
    label: 'Mini Boss',
    emoji: 'boss',
    description: 'Jadwal spawn, tombol serang, dan pembagian hadiah',
    build: () =>
      baseEmbed()
        .setColor(COLORS.error)
        .setTitle(`${e('boss')} Mini Boss`)
        .setDescription(
          [
            `${e('clock')} Satu boss muncul acak tiap **00:00** dan **12:00** di channel mini boss`,
            `${e('boss_hit')} Klik tombol **Serang!** di pesan boss — jeda **${Math.round(BOSS.ATTACK_COOLDOWN_MS / 1000)} detik** tiap serangan`,
            `${e('boss_hp')} Cuma boss yang punya HP, kamu tidak bisa mati`,
            `${e('warn')} Tapi boss bisa **membalas**: cooldown molor, damage turun, serangan meleset, atau coin dompet dirampas`,
            `${e('buff')} Debuff tampil di \`/buffs\`; **Chrono Core** membersihkan semuanya`,
            `${e('warn')} Kalau HP-nya belum habis dalam 6 jam, boss kabur tanpa hadiah`,
            line,
          ].join('\n'),
        )
        .addFields(
          {
            name: 'Boss & Peluang Muncul',
            value: [
              `${e('boss')} **Pump Freakin** — 45%`,
              `${e('boss')} **Clown Orca** — 45%`,
              `${e('boss_loot')} **Ancient Mummy** — 10% (boss spesial, hadiah terbesar)`,
            ].join('\n'),
          },
          {
            name: 'Siapa yang Dapat Hadiah',
            value: [
              `${e('leaderboard')} **Top 3 damager**: 40% / 25% / 15% dari total hadiah`,
              `${e('boss_hit')} **Last hit**: 20% — bisa ditumpuk kalau kamu juga masuk top 3`,
              `${e('boss_loot')} Hadiahnya: item acak, coin, XP, dan poin`,
              `${e('ability')} Item ability boss (Sharpened Edge, Kingslayer, dll) menaikkan damage & loot`,
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
            'Tier ditentukan dari level dan tampil di kartu `/rank` & `/profile`.',
            line,
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

  items: {
    label: 'Item & Rarity',
    emoji: 'inventory',
    description: 'Rarity item, peluang muncul, dan efek',
    build: () =>
      baseEmbed()
        .setColor(COLORS.info)
        .setTitle(`${e('inventory')} Item & Rarity`)
        .setDescription(
          [
            'Stok `/shop` diundi dari 30 item bawaan; makin langka makin jarang muncul.',
            line,
            '`Common` bobot 30 · `Uncommon` 25 · `Rare` 20',
            '`Epic` 12 · `Legendary` 8 · `Mythic` 5',
          ].join('\n'),
        )
        .addFields(
          {
            name: 'Item Pakai vs Koleksi',
            value: [
              `${e('ability')} Item berefek bisa dipakai \`/use <id>\` — memberi **XP** atau **poin**`,
              `${e('inventory')} Item tanpa efek murni koleksi, tetap tercatat di tas`,
              `${e('warn')} Item habis setelah dipakai; efeknya tidak bisa dijual balik`,
            ].join('\n'),
          },
          {
            name: 'Contoh',
            value: [
              '`Slime Gel` +30 XP · `Tattered Parchment` +2 poin',
              '`Holy Grail Fragment` +400 XP · `Chrono Core` +200 poin',
            ].join('\n'),
          },
        ),
  },

  rewards: {
    label: 'Reward',
    emoji: 'streak',
    description: 'Hadiah naik level & daily streak',
    build: () =>
      baseEmbed()
        .setColor(COLORS.warn)
        .setTitle(`${e('streak')} Reward`)
        .addFields(
          {
            name: 'Naik Level',
            value: [
              `${e('point')} Poin: **level × 10**`,
              `${e('coin')} Coin: **level × 50**`,
              `${e('inventory')} Peluang item random: **10% + 1% per level** (maks 50%)`,
              `${e('level')} XP berlebih tidak hangus — bisa lompat beberapa level sekaligus`,
            ].join('\n'),
          },
          {
            name: 'Daily',
            value: [
              `${e('daily')} Dasar **500 coin**, bonus **+100 per hari streak**`,
              `${e('streak')} Klaim tiap hari tanpa bolong biar streak tidak reset`,
            ].join('\n'),
          },
        ),
  },

  utility: {
    label: 'Utilitas',
    emoji: 'info',
    description: 'Ping, botinfo, credit, dan guide',
    build: () =>
      baseEmbed()
        .setColor(COLORS.neutral)
        .setTitle(`${e('info')} Utilitas`)
        .setDescription(
          [
            `${e('ping')} \`/ping\` — cek latency bot dan API Discord`,
            `${e('database')} \`/botinfo\` — versi bot, Node.js, discord.js, ukuran database,`,
            'uptime, memori, jumlah server, member, dan command',
            `${e('developer')} \`/credit\` — siapa saja yang membangun bot ini`,
            `${e('guide')} \`/guide\` — panduan ini`,
          ].join('\n'),
        ),
  },

  admin: {
    label: 'Admin',
    emoji: 'warn',
    description: 'Command khusus pengelola server',
    build: () =>
      baseEmbed()
        .setColor(COLORS.error)
        .setTitle(`${e('warn')} Command Admin`)
        .setDescription(
          [
            'Hanya terlihat oleh member dengan izin **Administrator**.',
            'Pemilik server bisa membukanya per-role lewat Pengaturan → Integrasi.',
            line,
            `${e('coin')} \`/admin give-coin <user> <jumlah>\` — beri coin untuk event/hadiah`,
            `${e('level')} \`/admin set-level <user> <level>\` — atur level manual`,
            `${e('error')} \`/admin reset-user <user> <konfirmasi>\` — hapus semua data user`,
            'di server ini (saldo, poin, level, inventori, quest). Wajib `konfirmasi: true`.',
          ].join('\n'),
        ),
  },

  tips: {
    label: 'Tips',
    emoji: 'arrow',
    description: 'Cara naik level dengan cepat',
    build: () =>
      baseEmbed()
        .setColor(COLORS.info)
        .setTitle(`${e('arrow')} Tips`)
        .setDescription(
          [
            `${e('arrow')} Ngobrol tiap hari — XP kecil tapi konsisten paling cepat`,
            `${e('arrow')} Nongkrong di voice **berdua atau lebih**, poin jalan sendiri`,
            `${e('arrow')} Cek \`/quest\` pagi hari; hadiah quest jauh lebih besar dari daily`,
            `${e('arrow')} Cek \`/shop\` tiap 10 menit, item bagus cepat habis`,
            `${e('arrow')} Simpan coin di bank biar aman dan tidak kepakai iseng`,
            `${e('arrow')} Kalau poin kurang, tukar coin pakai \`/exchange\``,
            `${e('arrow')} Kirim pesan yang beda-beda — duplikat persis tidak dihitung`,
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
  const closeEmoji = eo('cancel');
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

