const { SlashCommandBuilder } = require('discord.js');
const { themedEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { pagerRow } = require('../../ui/pager');

// Daftar tim per role. Mau ganti/tambah orang? Edit langsung array member
// di bawah — pakai Discord User ID, tidak perlu sentuh bagian render.
const PAGES = [
  {
    key: 'developer',
    title: 'Credit — Developer',
    emoji: 'developer',
    groups: [
      {
        role: 'Backend',
        emoji: 'backend',
        members: ['1056938161672044544', '987011050811580456'],
      },
      {
        role: 'Frontend',
        emoji: 'frontend',
        members: ['987011050811580456'],
      },
    ],
  },
  {
    key: 'executive',
    title: 'Credit — Executive',
    emoji: 'person',
    groups: [
      {
        role: 'Server Manager',
        emoji: 'servermanager',
        members: ['421921796720164876', '1056938161672044544'],
      },
      {
        role: 'Idea Master',
        emoji: 'idea',
        members: ['798140384962019368'],
      },
      {
        role: 'Boss Artwork',
        emoji: 'artwork',
        members: ['1537045204169924688'],
      },
      {
        role: 'UI/UX & Aset Emoji',
        emoji: 'person',
        members: ['1056938161672044544'],
      },
    ],
  },
  {
    key: 'betatester',
    title: 'Credit — Beta Tester',
    emoji: 'betatester',
    groups: [
      {
        role: 'Beta Tester',
        emoji: 'betatester',
        members: [
          '965646301515645018',
          '855461441283817532',
          '798766891107090462',
          '1371005137799090206',
          '1537045204169924688',
          '421921796720164876',
          '987011050811580456',
          '1056938161672044544',
        ],
      },
    ],
  },
];

// Baris "Bot ini dibangun oleh" cuma nampilin role inti: Backend, Frontend,
// Boss Artwork — bukan semua role di seluruh halaman. Diambil langsung dari
// PAGES biar tetap sinkron kalau member role ini diganti.
const CORE_CREDIT_ROLES = ['Backend', 'Frontend', 'Boss Artwork'];
const CORE_IDS = [
  ...new Set(
    PAGES.flatMap(p => p.groups.filter(g => CORE_CREDIT_ROLES.includes(g.role)).flatMap(g => g.members)),
  ),
];

/**
 * Bangun payload embed + tombol pager untuk satu halaman credit.
 * Dipakai command ini dan handler tombol `credit_page` di interactionCreate.js.
 */
function buildCredit(page = 0) {
  const total = PAGES.length;
  const current = Math.min(Math.max(page, 0), total - 1);
  const data = PAGES[current];

  const embed = themedEmbed(data.emoji, data.title, COLORS.primary)
    .setDescription(
      [
        `${e('person')} Bot ini dibangun oleh:`,
        `${CORE_IDS.map(id => `<@${id}>`).join(' · ')}`,
        DIVIDER,
      ].join('\n'),
    )
    .addFields(
      data.groups.map(g => ({
        name: `${e(g.emoji)} ${g.role}`,
        value: g.members.map(id => `<@${id}>`).join('\n'),
        inline: true,
      })),
    )
    .setFooter({ text: `Halaman ${current + 1}/${total} • Terima kasih sudah memakai bot ini` });

  return {
    embeds: [embed],
    components: pagerRow('credit_page', current, total),
  };
}

module.exports = {
  PAGES,
  buildCredit,
  data: new SlashCommandBuilder().setName('credit').setDescription('Siapa saja yang membangun bot ini'),
  async execute(interaction) {
    await interaction.reply(buildCredit(0));
  },
};

