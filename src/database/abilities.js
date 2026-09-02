const { db } = require('./connection');
const { ABILITIES } = require('../lib/abilities');
const { xpForLevel } = require('../config/constants');
const { getPoints } = require('./points');
const { addBuff, addGuildBuff, extendBuffs } = require('./buffs');
const { clearDebuffs } = require('./debuffs');
const { resetUser } = require('../lib/antispam');
const { DAILY } = require('../config/constants');
const { dateKey } = require('../lib/daily');

// Mundurkan lastDaily ke kemarin, bukan NULL: user bisa klaim lagi sekarang
// tanpa kehilangan streak yang sudah dikumpulkan.
function rewindDaily(userId, guildId) {
  const yesterday = dateKey(new Date(Date.now() - DAILY.DAY_MS));
  db.prepare('UPDATE users SET lastDaily = ? WHERE userId = ? AND guildId = ?').run(
    yesterday,
    userId,
    guildId,
  );
}

// Ability instant: jalan sekali saat /use, tidak menyisakan buff.
// Tiap handler mengembalikan potongan kalimat untuk pesan /use.
const INSTANT = {
  daily_reset(userId, guildId) {
    rewindDaily(userId, guildId);
    return 'cooldown `/daily` direset, kamu bisa klaim lagi sekarang';
  },
  cooldown_reset(userId, guildId) {
    rewindDaily(userId, guildId);
    resetUser(userId, guildId);
    // Chrono Core sekaligus membersihkan kutukan dari serangan balik boss.
    const cleared = clearDebuffs(userId, guildId);
    return cleared
      ? `semua cooldown milikmu direset dan ${cleared} debuff boss dibersihkan`
      : 'semua cooldown milikmu direset';
  },
  extend_buffs(userId, guildId, effect) {
    const count = extendBuffs(userId, guildId, effect.durationMs);
    return count ? `${count} buff aktif diperpanjang` : 'tidak ada buff aktif untuk diperpanjang';
  },
  xp_fill(userId, guildId) {
    const stats = getPoints(userId, guildId);
    const needed = Math.max(0, xpForLevel(stats.level) - stats.xp);
    db.prepare('UPDATE points SET xp = ? WHERE userId = ? AND guildId = ?').run(
      xpForLevel(stats.level),
      userId,
      guildId,
    );
    return `XP terisi penuh (+${needed} XP)`;
  },
};

// Ability buff: memasang satu atau beberapa baris di user_buffs.
const BUFF = {
  all_mult: (userId, guildId, effect) =>
    ['coin', 'xp', 'points'].forEach(key => addBuff(userId, guildId, { ...effect, key })),
  server_xp: (userId, guildId, effect) => addGuildBuff(guildId, { ...effect, key: 'xp' }),
  default: (userId, guildId, effect) => addBuff(userId, guildId, effect),
};

/** Jalankan ability satu item. Mengembalikan potongan pesan untuk /use. */
function runAbility(userId, guildId, effect) {
  const meta = ABILITIES[effect.key];
  if (!meta) return null;
  if (meta.kind === 'instant') return INSTANT[effect.key](userId, guildId, effect);
  (BUFF[effect.key] ?? BUFF.default)(userId, guildId, effect);
  return null;
}

module.exports = { runAbility };
