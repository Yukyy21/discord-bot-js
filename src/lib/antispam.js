const { CHAT } = require('../config/constants');

const recent = new Map();
const MAX_TRACKED = 1000;

function prune(now) {
  for (const [key, entry] of recent) {
    if (now - entry.lastAt > CHAT.DUPLICATE_WINDOW_MS) recent.delete(key);
  }
}

function shouldCountMessage(userId, guildId, content, now = Date.now()) {
  if (recent.size > MAX_TRACKED) prune(now);

  const key = `${guildId}:${userId}`;
  const prev = recent.get(key);
  recent.set(key, { lastAt: now, lastContent: content });

  if (!prev) return true;
  if (now - prev.lastAt < CHAT.ANTISPAM_COOLDOWN_MS) return false;
  if (prev.lastContent === content && now - prev.lastAt < CHAT.DUPLICATE_WINDOW_MS) return false;
  return true;
}

/** Time Skip: lupakan catatan anti-spam user supaya cooldownnya hilang. */
function resetUser(userId, guildId) {
  recent.delete(`${guildId}:${userId}`);
}

module.exports = { shouldCountMessage, resetUser };
