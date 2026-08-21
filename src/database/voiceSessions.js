const { db } = require('./connection');

/**
 * Sesi voice aktif disimpan juga di sini (write-through dari
 * events/voiceStateUpdate.js) supaya bot bisa mati-restart tanpa menghanguskan
 * waktu voice yang sudah berjalan. Satu baris per user per guild.
 */
function saveVoiceSession(userId, guildId, { joinedAt, lastGrant, eligible }) {
  db.prepare(`
    INSERT INTO voice_sessions (userId, guildId, joinedAt, lastGrant, eligible)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (userId, guildId)
    DO UPDATE SET joinedAt = excluded.joinedAt,
                  lastGrant = excluded.lastGrant,
                  eligible = excluded.eligible
  `).run(userId, guildId, joinedAt, lastGrant, eligible ? 1 : 0);
}

function getVoiceSession(userId, guildId) {
  return db.prepare('SELECT * FROM voice_sessions WHERE userId = ? AND guildId = ?').get(userId, guildId) || null;
}

function deleteVoiceSession(userId, guildId) {
  db.prepare('DELETE FROM voice_sessions WHERE userId = ? AND guildId = ?').run(userId, guildId);
}

/** Semua sesi tersimpan; dipakai saat boot untuk buang baris usang. */
function getAllVoiceSessions() {
  return db.prepare('SELECT * FROM voice_sessions').all();
}

module.exports = { saveVoiceSession, getVoiceSession, deleteVoiceSession, getAllVoiceSessions };
