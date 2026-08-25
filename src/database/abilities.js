const { db } = require('./connection');
const { ABILITIES } = require('../lib/abilities');
const { xpForLevel } = require('../config/constants');
const { getPoints } = require('./points');
const { addBuff, addGuildBuff, extendBuffs } = require('./buffs');
const { resetUser } = require('../lib/antispam');

// Ability instant: jalan sekali saat /use, tidak menyisakan buff.
// Tiap handler mengembalikan potongan kalimat untuk pesan /use.
const INSTANT = {
  daily_reset(userId, guildId) {
    db.prepare('UPDATE users SET lastDaily = NULL WHERE userId = ? AND guildId = ?').run(userId, guildId);
    return 'cooldown `/daily` direset, kamu bisa klaim lagi sekarang';
  },
  cooldown_reset(userId, guildId) {
    db.prepare('UPDATE users SET lastDaily = NULL WHERE userId = ? AND guildId = ?').run(userId, guildId);
    resetUser(userId, guildId);
    return 'semua cooldown milikmu direset';
  },
  extend_buffs(userId, guildId, effect) {
    const count = extendBuffs(userId, guildId, effect.durationMs);
    return count ? `${count} buff aktif diperpanjang` : 'tidak ada buff aktif untuk diperpanjang';
  },
  xp_fill(userId, guildId) {
    const stats = getPoints(userId, guildId);
    const needed = Math.max(0, xpForLevel(stats.level) - stats.xp);
    db.prepare('UPDATE points SET xp = ? WHERE userId = ? AND guildId = ?')
      .run(xpForLevel(stats.level), userId, guildId);
    return `XP terisi penuh (+${needed} XP), tinggal chat sekali untuk naik level`;
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
