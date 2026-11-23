const { db } = require('./connection');
const { weeklyKey } = require('../lib/quests');

function validateId(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
}

function validatePositiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function resetSeason(guildId, actorId, now = Date.now()) {
  validateId(guildId, 'guildId');
  validateId(actorId, 'actorId');
  if (!Number.isSafeInteger(now) || now < 0 || Number.isNaN(new Date(now).getTime())) {
    throw new RangeError('now must be a valid non-negative integer timestamp');
  }
  const weeklyPeriod = weeklyKey(new Date(now));
  return db
    .transaction(() => {
      const { seasonNumber } = db
        .prepare(
          `
      SELECT COALESCE(MAX(seasonNumber), 0) + 1 AS seasonNumber
      FROM seasons WHERE guildId = ?
    `,
        )
        .get(guildId);
      const users = db
        .prepare(
          `
      SELECT userId FROM users WHERE guildId = ?
      UNION SELECT userId FROM points WHERE guildId = ?
      UNION SELECT userId FROM weekly_points WHERE guildId = ?
      UNION SELECT userId FROM voice_sessions WHERE guildId = ?
    `,
        )
        .all(guildId, guildId, guildId, guildId);
      const summary = {
        guildId,
        seasonNumber,
        archivedAt: now,
        actorId,
        weeklyPeriod,
        userCount: users.length,
      };
      db.prepare(
        `
      INSERT INTO seasons (guildId, seasonNumber, archivedAt, actorId, weeklyPeriod, userCount)
      VALUES (@guildId, @seasonNumber, @archivedAt, @actorId, @weeklyPeriod, @userCount)
    `,
      ).run(summary);
      const stats = db.prepare(`
      SELECT COALESCE(u.balance, 0) AS balance, COALESCE(u.bank, 0) AS bank,
        COALESCE(p.points, 0) AS points, COALESCE(p.voice_seconds, 0) AS voice_seconds
      FROM (SELECT ? AS userId, ? AS guildId) AS member
      LEFT JOIN users u ON u.userId = member.userId AND u.guildId = member.guildId
      LEFT JOIN points p ON p.userId = member.userId AND p.guildId = member.guildId
    `);
      const weekly = db.prepare(`
      SELECT period, points FROM weekly_points WHERE userId = ? AND guildId = ? ORDER BY period
    `);
      const archive = db.prepare(`
      INSERT INTO season_stats
        (guildId, seasonNumber, userId, balance, bank, points, voice_seconds, weeklyPoints, weeklyRows)
      VALUES (@guildId, @seasonNumber, @userId, @balance, @bank, @points, @voice_seconds, @weeklyPoints, @weeklyRows)
    `);
      for (const { userId } of users) {
        const weeklyRows = weekly.all(userId, guildId);
        archive.run({
          guildId,
          seasonNumber,
          userId,
          ...stats.get(userId, guildId),
          weeklyPoints: weeklyRows.find(row => row.period === weeklyPeriod)?.points ?? 0,
          weeklyRows: JSON.stringify(weeklyRows),
        });
      }
      db.prepare('UPDATE users SET balance = 0, bank = 0 WHERE guildId = ?').run(guildId);
      db.prepare('UPDATE points SET points = 0, voice_seconds = 0 WHERE guildId = ?').run(guildId);
      db.prepare('UPDATE weekly_points SET points = 0 WHERE guildId = ?').run(guildId);
      db.prepare('UPDATE voice_sessions SET joinedAt = ?, lastGrant = ? WHERE guildId = ?').run(
        now,
        now,
        guildId,
      );
      return summary;
    })
    .immediate();
}

function getSeasonHistory(guildId, limit = 10) {
  validateId(guildId, 'guildId');
  validatePositiveInteger(limit, 'limit');
  return db
    .prepare(
      `
    SELECT guildId, seasonNumber, archivedAt, actorId, weeklyPeriod, userCount
    FROM seasons WHERE guildId = ? ORDER BY seasonNumber DESC LIMIT ?
  `,
    )
    .all(guildId, limit);
}

function getSeasonStandings(guildId, seasonNumber, category, limit = 10) {
  validateId(guildId, 'guildId');
  validatePositiveInteger(seasonNumber, 'seasonNumber');
  validatePositiveInteger(limit, 'limit');
  const columns = {
    wallet: 'balance',
    balance: 'balance',
    bank: 'bank',
    points: 'points',
    voice: 'voice_seconds',
    voice_seconds: 'voice_seconds',
    weekly: 'weeklyPoints',
    weeklyPoints: 'weeklyPoints',
  };
  if (!Object.hasOwn(columns, category)) {
    throw new RangeError(
      'category must be wallet, balance, bank, points, voice, voice_seconds, weekly, or weeklyPoints',
    );
  }
  return db
    .prepare(
      `
    SELECT guildId, seasonNumber, userId, balance, bank, points, voice_seconds, weeklyPoints, weeklyRows,
      ${columns[category]} AS value
    FROM season_stats WHERE guildId = ? AND seasonNumber = ?
    ORDER BY ${columns[category]} DESC, userId ASC LIMIT ?
  `,
    )
    .all(guildId, seasonNumber, limit)
    .map(row => ({ ...row, weeklyRows: JSON.parse(row.weeklyRows) }));
}

module.exports = { resetSeason, getSeasonHistory, getSeasonStandings };
