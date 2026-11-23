const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { weeklyKey } = require('../src/lib/quests');

const db = new Database(':memory:');
const connectionPath = require.resolve('../src/database/connection');
require.cache[connectionPath] = {
  id: connectionPath,
  filename: connectionPath,
  loaded: true,
  exports: { db },
};
const { createTables, runMigrations } = require('../src/database/schema');
createTables();
runMigrations();
const { resetSeason, getSeasonHistory, getSeasonStandings } = require('../src/database');
const now = new Date('2026-11-20T12:00:00Z').getTime();
const period = weeklyKey(new Date(now));

function rows(table, guildId = 'g') {
  return db.prepare(`SELECT * FROM ${table} WHERE guildId = ? ORDER BY userId`).all(guildId);
}

function seed(guildId = 'g') {
  db.prepare(
    `INSERT INTO users (userId, guildId, balance, bank, lastDaily, streak)
    VALUES ('shared', ?, 120, 240, '2026-11-19', 7)`,
  ).run(guildId);
  db.prepare(
    `INSERT INTO points (userId, guildId, points, pendingWords, xp, level, voice_seconds)
    VALUES ('shared', ?, 80, 9, 1234, 8, 600)`,
  ).run(guildId);
  db.prepare(
    `INSERT INTO weekly_points (userId, guildId, period, points)
    VALUES ('shared', ?, ?, 33), ('shared', ?, 'weekly:2025-W01', 91)`,
  ).run(guildId, period, guildId);
  db.prepare(
    `INSERT INTO voice_sessions (userId, guildId, joinedAt, lastGrant, eligible)
    VALUES ('shared', ?, 100, 200, 1)`,
  ).run(guildId);
  db.prepare(
    `INSERT INTO user_items (userId, guildId, itemId, quantity)
    VALUES ('shared', ?, 1, 3)`,
  ).run(guildId);
  db.prepare(
    `INSERT INTO quests (userId, guildId, period, questId, target, reward, progress, claimed)
    VALUES ('shared', ?, 'daily:2026-11-20', 'test', 10, 5, 4, 1)`,
  ).run(guildId);
  db.prepare(
    `INSERT INTO user_buffs (userId, guildId, key, value, expiresAt, charges)
    VALUES ('shared', ?, 'test', 2, ?, 3)`,
  ).run(guildId, now + 1000);
}

test.beforeEach(() => {
  db.prepare('DELETE FROM season_stats').run();
  for (const { name } of db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()) {
    db.prepare(`DELETE FROM ${name}`).run();
  }
});
test.after(() => db.close());

test('archives every stored stat user and all weekly rows, only resetting requested fields in one guild', () => {
  seed();
  seed('other');
  db.exec(`
    INSERT INTO users (userId, guildId, balance) VALUES ('wallet-only', 'g', 15), ('zero', 'g', 0);
    INSERT INTO points (userId, guildId, points, voice_seconds) VALUES ('points-only', 'g', 900, 45);
    INSERT INTO weekly_points (userId, guildId, period, points) VALUES ('weekly-only', 'g', 'weekly:2025-W02', 77);
    INSERT INTO voice_sessions (userId, guildId, joinedAt, lastGrant, eligible) VALUES ('voice-only', 'g', 1, 2, 0);
  `);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map(row => row.name)
    .filter(name => !['seasons', 'season_stats'].includes(name));
  const before = Object.fromEntries(tables.map(name => [name, db.prepare(`SELECT * FROM ${name}`).all()]));
  const summary = resetSeason('g', 'admin', now);
  assert.deepEqual(summary, {
    guildId: 'g',
    seasonNumber: 1,
    archivedAt: now,
    actorId: 'admin',
    weeklyPeriod: period,
    userCount: 6,
  });
  const standings = getSeasonStandings('g', 1, 'points');
  assert.equal(standings.length, 6);
  assert.equal(standings[0].userId, 'points-only');
  assert.deepEqual(
    standings.find(row => row.userId === 'shared'),
    {
      guildId: 'g',
      seasonNumber: 1,
      userId: 'shared',
      balance: 120,
      bank: 240,
      points: 80,
      voice_seconds: 600,
      weeklyPoints: 33,
      value: 80,
      weeklyRows: [
        { period: 'weekly:2025-W01', points: 91 },
        { period, points: 33 },
      ],
    },
  );
  assert.equal(standings.find(row => row.userId === 'wallet-only').balance, 15);
  assert.deepEqual(standings.find(row => row.userId === 'weekly-only').weeklyRows, [
    { period: 'weekly:2025-W02', points: 77 },
  ]);
  assert.equal(standings.find(row => row.userId === 'weekly-only').weeklyPoints, 0);
  for (const table of tables) {
    const expected = before[table].map(row => {
      if (row.guildId !== 'g') return row;
      if (table === 'users') return { ...row, balance: 0, bank: 0 };
      if (table === 'points') return { ...row, points: 0, voice_seconds: 0 };
      if (table === 'weekly_points') return { ...row, points: 0 };
      if (table === 'voice_sessions') return { ...row, joinedAt: now, lastGrant: now };
      return row;
    });
    assert.deepEqual(db.prepare(`SELECT * FROM ${table}`).all(), expected, table);
  }
  assert.equal(getSeasonHistory('other').length, 0);
  assert.deepEqual(getSeasonStandings('other', 1, 'points'), []);
});

test('numbers seasons per guild, preserves archives, supports empty guild and newest-first history limits', () => {
  seed();
  const first = resetSeason('g', 'admin', now);
  const archived = getSeasonStandings('g', 1, 'wallet');
  db.prepare("UPDATE users SET balance = 500 WHERE guildId = 'g'").run();
  const second = resetSeason('g', 'admin-2', now + 1000);
  assert.equal(second.seasonNumber, 2);
  assert.deepEqual(getSeasonHistory('g'), [second, first]);
  assert.deepEqual(getSeasonHistory('g', 1), [second]);
  assert.deepEqual(getSeasonStandings('g', 1, 'wallet'), archived);
  assert.equal(getSeasonStandings('g', 2, 'wallet')[0].value, 500);
  const empty = resetSeason('other', 'admin', now);
  assert.equal(empty.seasonNumber, 1);
  assert.equal(empty.userCount, 0);
  assert.deepEqual(getSeasonStandings('other', 1, 'points'), []);
  assert.deepEqual(getSeasonStandings('g', 999, 'points'), []);
});

test('standings support all categories and aliases with deterministic ties and limits', () => {
  seed();
  db.exec("INSERT INTO users (userId, guildId, balance) VALUES ('aaa', 'g', 120)");
  resetSeason('g', 'admin', now);
  const expected = {
    wallet: 120,
    balance: 120,
    bank: 240,
    points: 80,
    voice: 600,
    voice_seconds: 600,
    weekly: 33,
    weeklyPoints: 33,
  };
  for (const [category, value] of Object.entries(expected)) {
    const standings = getSeasonStandings('g', 1, category, 1);
    assert.equal(standings.length, 1);
    assert.equal(standings[0].value, value);
  }
  assert.deepEqual(
    getSeasonStandings('g', 1, 'wallet').map(row => row.userId),
    ['aaa', 'shared'],
  );
});

test('failure after stat updates rolls back archive, balances, weekly rows and voice timestamps', () => {
  seed();
  const tables = ['users', 'points', 'weekly_points', 'voice_sessions'];
  const before = Object.fromEntries(tables.map(table => [table, rows(table)]));
  db.exec(`CREATE TRIGGER fail_season_reset BEFORE UPDATE ON voice_sessions
    BEGIN SELECT RAISE(ABORT, 'forced failure'); END`);
  try {
    assert.throws(() => resetSeason('g', 'admin', now), /forced failure/);
    for (const table of tables) assert.deepEqual(rows(table), before[table]);
    assert.deepEqual(getSeasonHistory('g'), []);
    assert.deepEqual(getSeasonStandings('g', 1, 'points'), []);
  } finally {
    db.exec('DROP TRIGGER fail_season_reset');
  }
  assert.equal(resetSeason('g', 'admin', now).seasonNumber, 1);
});

test('validates identifiers, timestamps, season numbers, categories and limits without writes', () => {
  for (const id of ['', ' ', null, undefined, 123]) {
    assert.throws(() => resetSeason(id, 'admin', now), TypeError);
    assert.throws(() => resetSeason('g', id, now), TypeError);
    assert.throws(() => getSeasonHistory(id), TypeError);
    assert.throws(() => getSeasonStandings(id, 1, 'points'), TypeError);
  }
  for (const value of [-1, 1.5, NaN, Infinity, '1', null, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => resetSeason('g', 'admin', value), RangeError);
  }
  for (const value of [0, -1, 1.5, NaN, Infinity, '1', null, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => getSeasonHistory('g', value), RangeError);
    assert.throws(() => getSeasonStandings('g', value, 'points'), RangeError);
    assert.throws(() => getSeasonStandings('g', 1, 'points', value), RangeError);
  }
  for (const category of ['xp', '__proto__', 'points DESC; DROP TABLE users', undefined, null]) {
    assert.throws(() => getSeasonStandings('g', 1, category), RangeError);
  }
  assert.deepEqual(getSeasonHistory('g'), []);
});

test('default timestamp uses Date.now and resets persisted sessions to that exact timestamp', () => {
  seed();
  const original = Date.now;
  Date.now = () => now;
  try {
    assert.equal(resetSeason('g', 'admin').archivedAt, now);
    assert.equal(rows('voice_sessions')[0].joinedAt, now);
    assert.equal(rows('voice_sessions')[0].lastGrant, now);
  } finally {
    Date.now = original;
  }
});
