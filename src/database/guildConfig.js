// Konfigurasi per-guild (Bugs.md #6). Tabel guild_config menyimpan channel
// boss tiap server, jadi mini boss tidak lagi terikat satu BOSS_CHANNEL_ID.
// Juga menyimpan betaMode (dipakai /beta) untuk pengumuman berkala "bot
// masih beta, laporkan lewat /report".
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

/** Status mode beta guild tertentu (boolean). Default false kalau belum diatur. */
function getBetaMode(guildId) {
  return Boolean(
    db.prepare('SELECT betaMode FROM guild_config WHERE guildId = ?').get(guildId)?.betaMode,
  );
}

/** Semua guild yang sedang mengaktifkan mode beta. */
function getAllBetaGuilds() {
  return db
    .prepare('SELECT guildId FROM guild_config WHERE betaMode = 1')
    .all()
    .map(row => row.guildId);
}

/** Nyalakan/matikan mode beta untuk satu guild. */
function setBetaMode(guildId, enabled) {
  db.prepare(
    `
    INSERT INTO guild_config (guildId, betaMode, updatedAt) VALUES (?, ?, ?)
    ON CONFLICT(guildId) DO UPDATE SET
      betaMode = excluded.betaMode,
      updatedAt = excluded.updatedAt
  `,
  ).run(guildId, enabled ? 1 : 0, Date.now());
}

module.exports = {
  getBossChannel,
  getAllBossChannels,
  setBossChannel,
  clearBossChannel,
  getBetaMode,
  getAllBetaGuilds,
  setBetaMode,
};
