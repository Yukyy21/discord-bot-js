// ============================================================
// PUSAT CUSTOM EMOJI BOT
// ------------------------------------------------------------
// Semua emoji bot didefinisikan di REGISTRY bawah ini.
// - key      : nama yang dipakai di kode, contoh e('coin')
// - name     : nama emoji di Discord Developer Portal
// - id       : ID emoji (dari tab Emojis di Developer Portal)
// - animated : true kalau emojinya GIF (<a:...>)
//
// Mau ganti/tambah emoji? Cukup ubah id di sini, ATAU override
// dari config.js (EMOJI_IDS / EMOJI_ANIMATED) tanpa sentuh file ini.
// Kalau ID kosong/salah dihapus, bot otomatis fallback ke unicode
// supaya tidak pernah error.
// ============================================================
const { EMOJI_IDS = {}, EMOJI_ANIMATED = {} } = require('../config');

const REGISTRY = {
  // — Ekonomi —
  coin:       { name: 'coin',        id: '1540187735535521822', animated: false, fallback: '💰' },
  bank:       { name: 'bank',        id: '1540187726987661363', animated: false, fallback: '🏦' },
  daily:      { name: 'daily',       id: '1540187737229893662', animated: false, fallback: '🎁' },
  streak:     { name: 'streak',      id: '1540187786831732836', animated: true,  fallback: '🔥' },
  shop:       { name: 'shop',        id: '1540187785191890995', animated: false, fallback: '🛒' },
  buy:        { name: 'struk',       id: '1540187788404592661', animated: false, fallback: '🧾' },
  inventory:  { name: 'tas',         id: '1540187793106534480', animated: false, fallback: '🎒' },
  give:       { name: 'give',        id: '1540187750815498321', animated: false, fallback: '🤝' },
  exchange:   { name: 'exchange',    id: '1540187743156445274', animated: false, fallback: '🔄' },

  // — Poin & Level —
  point:      { name: 'point',       id: '1540187774664056942', animated: false, fallback: '⭐' },
  xp:         { name: 'xp',          id: '1540187807971151912', animated: true,  fallback: '✨' },
  level:      { name: 'levelup',     id: '1540187763637362788', animated: true,  fallback: '🔼' },
  profile:    { name: 'profile',     id: '1540187776060882997', animated: false, fallback: '🪪' },
  rank:       { name: 'rank',        id: '1540187778002976828', animated: false, fallback: '🏅' },

  // — Leaderboard —
  leaderboard:{ name: 'leaderboard', id: '1540187761024438364', animated: false, fallback: '🏆' },
  first:      { name: 'first',       id: '1540187748986654720', animated: true,  fallback: '🥇' },
  second:     { name: 'second',      id: '1540187783560175616', animated: true,  fallback: '🥈' },
  third:      { name: 'third',       id: '1540189171321278624', animated: true,  fallback: '🥉' },

  // — Aktivitas —
  voice:      { name: 'voice',       id: '1540187804636684360', animated: false, fallback: '🎤' },
  chat:       { name: 'chat',        id: '1540187730749956106', animated: false, fallback: '💬' },
  clock:      { name: 'clock',       id: '1540187732335140864', animated: false, fallback: '⏱️' },

  // — Status & Navigasi —
  success:    { name: 'success',     id: '1540187791055654954', animated: true,  fallback: '✅' },
  error:      { name: 'error',       id: '1540187740958629899', animated: false, fallback: '❌' },
  warn:       { name: 'warn',        id: '1540187806435909763', animated: false, fallback: '⚠️' },
  info:       { name: 'info',        id: '1540187759078154271', animated: false, fallback: 'ℹ️' },
  loading:    { name: 'loading',     id: '1540187766350946404', animated: true,  fallback: '⏳' },
  arrow:      { name: 'arrow',       id: '1540187725334839316', animated: true,  fallback: '➡️' },
  home:       { name: 'home',        id: '1540187755999531109', animated: false, fallback: '🏠' },
  guide:      { name: 'guide',       id: '1540187752652607639', animated: false, fallback: '📖' },
  ping:       { name: 'ping',        id: '1540187772927873084', animated: true,  fallback: '🏓' },
  next:       { name: 'Next',        id: '1541044838911442985', animated: false, fallback: '▶️' },
  back:       { name: 'Back',        id: '1541044840802820168', animated: false, fallback: '◀️' },
  cancel:     { name: 'cancel',      id: '1541044497540972625', animated: true,  fallback: '🚫' },

  // — AI (/ai-ask) —
  ai_answer:  { name: 'Aiask1',      id: '1541408696838398002', animated: true,  fallback: '🤖' },
  ai_think:   { name: 'Aithink',     id: '1541408699241725973', animated: true,  fallback: '💭' },
  ai_answer2: { name: 'aiask2',      id: '1541408702207234209', animated: true,  fallback: '✨' },

  // — Quest —
  quest:      { name: 'quest',       id: '1540598685853814834', animated: false, fallback: '📜' },

  // — Ability & Buff —
  ability:    { name: 'ability',     id: '1541044487789223996', animated: false, fallback: '✴️' },
  buff:       { name: 'buff',        id: '1541044489622392965', animated: false, fallback: '🔺' },
  buff_active:{ name: 'Buffactive',  id: '1541076451154198618', animated: true,  fallback: '🌀' },

  // — Boss (sistem mini boss) —
  boss:       { name: 'boss',        id: '1541044491950231672', animated: false, fallback: '👹' },
  boss_hp:    { name: 'bosshp',      id: '1541044493850247208', animated: false, fallback: '❤️' },
  boss_loot:  { name: 'lootboss',    id: '1541044495502807180', animated: false, fallback: '🎁' },
  // Belum di-upload; isi ID-nya di config.js kalau mau ikon serang khusus.
  boss_hit:   { name: 'bosshit',     id: '', animated: false, fallback: '⚔️' },

  // — Credit & Info Bot —
  backend:    { name: 'Backend',      id: '1540378495320981564', animated: false, fallback: '🧠' },
  person:     { name: 'Dev_human',    id: '1540378492246556683', animated: false, fallback: '👤' },
  developer:  { name: 'developer',    id: '1540378489767731260', animated: true,  fallback: '💻' },
  frontend:   { name: 'Frontend',     id: '1540378497921319013', animated: false, fallback: '🎨' },
  discordjs:  { name: 'Discordjs',    id: '1540378499926196425', animated: false, fallback: '🤖' },
  nodejs:     { name: 'Nodejs',       id: '1540378501549400124', animated: false, fallback: '🟩' },
  database:   { name: 'Sql_database', id: '1540378503407607928', animated: false, fallback: '🗄️' },

  // — Rank Tier —
  tier_novice:     { name: 'Novice',     id: '1540187768330784798', animated: false, fallback: '🔹' },
  tier_apprentice: { name: 'Apprentice', id: '1540187723577430016', animated: false, fallback: '🔸' },
  tier_adept:      { name: 'Adept',      id: '1540187721505439765', animated: false, fallback: '🔷' },
  tier_veteran:    { name: 'Veteran',    id: '1540187803080597604', animated: false, fallback: '🔶' },
  tier_champion:   { name: 'Champion',   id: '1540187728874971218', animated: false, fallback: '💠' },
  tier_hero:       { name: 'Hero',       id: '1540187754380402728', animated: false, fallback: '🌟' },
  tier_demigod:    { name: 'Demigod',    id: '1540187739037900841', animated: false, fallback: '👑' },

  // — Progress bar (opsional) —
  // Belum di-upload. Isi ID-nya di config.js kalau mau bar full-emoji.
  bar_fill:   { name: 'bar_fill',    id: '', animated: false, fallback: '█' },
  bar_empty:  { name: 'bar_empty',   id: '', animated: false, fallback: '░' },
};

function resolve(key) {
  const base = REGISTRY[key];
  if (!base) return null;
  const id = EMOJI_IDS[key] ?? base.id;
  const animated = key in EMOJI_ANIMATED ? Boolean(EMOJI_ANIMATED[key]) : base.animated;
  return { name: base.name, id, animated, fallback: base.fallback };
}

/** Mention emoji siap pakai di teks embed / description / label. */
function e(key) {
  const em = resolve(key);
  if (!em) return '';
  if (!em.id) return em.fallback ?? '';
  return `<${em.animated ? 'a' : ''}:${em.name}:${em.id}>`;
}

/** Bentuk objek untuk opsi `emoji` di Button / SelectMenu builder. */
function eo(key) {
  const em = resolve(key);
  if (!em) return undefined;
  if (em.id) return { id: em.id, name: em.name, animated: em.animated };
  return em.fallback ? { name: em.fallback } : undefined;
}

/** Emoji tier dari nama rank di utils/ranks.js ("Novice" -> tier_novice). */
function tierEmoji(rankName) {
  return e(`tier_${String(rankName).toLowerCase()}`);
}

/** Emoji medali berdasarkan index leaderboard (0-based). */
function medal(index) {
  if (index === 0) return e('first');
  if (index === 1) return e('second');
  if (index === 2) return e('third');
  return `\`#${index + 1}\``;
}

module.exports = { e, eo, tierEmoji, medal, REGISTRY, EMOJI_NAMES: Object.keys(REGISTRY) };

