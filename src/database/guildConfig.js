// Konfigurasi per-guild (Bugs.md #6). Tabel guild_config menyimpan channel
// boss tiap server, jadi mini boss tidak lagi terikat satu BOSS_CHANNEL_ID.
const { db } = require('./connection');

/** Channel boss guild tertentu, atau null kalau belum diatur. */
function getBossChannel(guildId) {
  return db
    .prepare('SELECT bossChannelId FROM guild_config WHERE guildId = ?')
    .get(guildId)?.bossChannelId ?? null;
}

/** Semua guild yang sudah punya konfigurasi channel boss. */
function getAllBossChannels() {
  return db
    .prepare('SELECT guildId, bossChannelId FROM guild_config WHERE bossChannelId IS NOT NULL')
    .all();
}

/** Simpan/ubah channel boss guild. */
function setBossChannel(guildId, channelId) {
  db.prepare(
    `
    INSERT INTO guild_config (guildId, bossChannelId, updatedAt) VALUES (?, ?, ?)
    ON CONFLICT(guildId) DO UPDATE SET
      bossChannelId = excluded.bossChannelId,
      updatedAt = excluded.updatedAt
  `,
  ).run(guildId, channelId, Date.now());
}

/** Hapus konfigurasi channel boss guild — kembali ke fallback BOSS_CHANNEL_ID. */
function clearBossChannel(guildId) {
  db.prepare('UPDATE guild_config SET bossChannelId = NULL, updatedAt = ? WHERE guildId = ?').run(
    Date.now(),
    guildId,
  );
}

module.exports = { getBossChannel, getAllBossChannels, setBossChannel, clearBossChannel };