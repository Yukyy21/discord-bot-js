const { allowedBackground, decodeBackgroundImage, MAX_OUTPUT_BYTES } = require('./profileBackground');
const { buildProfileCard } = require('../cards/profileCard');
const { getRank } = require('./ranks');
const { xpForLevel } = require('../config/constants');
const { asset } = require('./paths');

function readProfileSnapshot(db, userId, guildId) {
  return db.prepare(`
    SELECT COALESCE(u.balance, 0) AS balance, COALESCE(u.bank, 0) AS bank,
      COALESCE(u.streak, 0) AS streak, COALESCE(p.points, 0) AS points,
      COALESCE(p.level, 0) AS level, COALESCE(p.xp, 0) AS xp,
      1 + (SELECT COUNT(*) FROM points r WHERE r.guildId = @guildId
        AND (r.level > COALESCE(p.level, 0) OR
          (r.level = COALESCE(p.level, 0) AND r.xp > COALESCE(p.xp, 0)))) AS rank
    FROM (SELECT 1) seed
    LEFT JOIN users u ON u.userId = @userId AND u.guildId = @guildId
    LEFT JOIN points p ON p.userId = @userId AND p.guildId = @guildId
  `).get({ userId, guildId });
}

function previewFailure(code, reason) {
  return Object.assign(new Error(reason), { code, reason });
}

async function renderProfilePreview({ userId, guildId, background }, { db, client, render = buildProfileCard, signal }) {
  const guild = client.guilds.cache.get(guildId);
  if (!client.isReady() || !guild) throw previewFailure(403, 'guild_unavailable');
  let member;
  try { member = await guild.members.fetch({ user: userId, force: true, cache: false }); }
  catch { throw previewFailure(403, 'member_unavailable'); }
  signal?.throwIfAborted();
  if (member.id !== userId || member.guild.id !== guildId) throw previewFailure(403, 'member_unavailable');
  const snapshot = readProfileSnapshot(db, userId, guildId);
  let selected = null;
  if (background !== null) {
    if (!background || typeof background !== 'object' || Array.isArray(background)) throw previewFailure(400, 'invalid_background');
    let value = background;
    if (value.kind === 'image') {
      if (Object.keys(value).sort().join(',') !== 'base64,id,kind,revision,slot' || typeof value.base64 !== 'string'
          || value.base64.length > Math.ceil(MAX_OUTPUT_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value.base64)) throw previewFailure(400, 'invalid_background');
      const buffer = Buffer.from(value.base64, 'base64');
      if (buffer.toString('base64') !== value.base64) throw previewFailure(400, 'invalid_background');
      value = { id: value.id, kind: value.kind, revision: value.revision, slot: value.slot, buffer };
    }
    selected = allowedBackground(value, snapshot.level);
    if (!selected || (selected.kind === 'image' && !await decodeBackgroundImage(selected.buffer))) throw previewFailure(400, 'invalid_background');
  }
  signal?.throwIfAborted();
  const rank = getRank(snapshot.level);
  const png = await render({
    ...snapshot, username: member.user.displayName,
    avatar: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
    xpNeeded: xpForLevel(snapshot.level), rankName: rank.name, rankLogo: asset('ranks', rank.logo), background: selected,
  });
  signal?.throwIfAborted();
  return png;
}

module.exports = { readProfileSnapshot, renderProfilePreview };
