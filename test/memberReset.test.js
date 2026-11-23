const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const db = new Database(':memory:');
const connectionPath = require.resolve('../src/database/connection');
require.cache[connectionPath] = {
  id: connectionPath,
  filename: connectionPath,
  loaded: true,
  exports: { db },
};
const { resetGuildMembers, resetSeason } = require('../src/database');

function seed(guildId) {
  const statements = [
    "INSERT INTO users (userId,guildId,balance) VALUES ('u',?,99)",
    "INSERT INTO points (userId,guildId,xp) VALUES ('u',?,99)",
    "INSERT INTO user_items (userId,guildId,itemId) VALUES ('u',?,1)",
    "INSERT INTO quests (userId,guildId,target,reward) VALUES ('u',?,1,1)",
    "INSERT INTO give_daily (userId,guildId) VALUES ('u',?)",
    "INSERT INTO voice_sessions VALUES ('u',?,1,1,1)",
    "INSERT INTO weekly_points (userId,guildId) VALUES ('u',?)",
    "INSERT INTO poruv_redemptions (userId,guildId,itemKey,itemName,price,createdAt) VALUES ('u',?,'a','a',1,1)",
    "INSERT INTO redeem_code_uses VALUES ('code',?,'u',1)",
    "INSERT INTO beta_reminders VALUES ('u',?,1)",
    "INSERT INTO staff (userId,guildId,divisi,addedAt,addedBy) VALUES ('u',?,'mod',1,'admin')",
    "INSERT INTO staff_activity (userId,guildId) VALUES ('u',?)",
    "INSERT INTO staff_ratings (staffUserId,raterUserId,guildId,stars,createdAt,updatedAt) VALUES ('u','r',?,5,1,1)",
    "INSERT INTO user_buffs (userId,guildId,key) VALUES ('u',?,'xp')",
    "INSERT INTO user_buffs (userId,guildId,key) VALUES ('*',?,'xp')",
    "INSERT INTO guild_config (guildId,bossChannelId) VALUES (?,'channel')",
    "INSERT INTO staff_divisi VALUES (?,'mod',5,1)",
    "INSERT INTO poruv_shop_items (guildId,key,name,price,createdAt) VALUES (?,'a','a',1,1)",
    "INSERT INTO redeem_codes (guildId,code,createdBy,createdAt,rewards,usesCount) VALUES (?,'code','admin',1,'[]',1)",
  ];
  for (const sql of statements) db.prepare(sql).run(guildId);
  const boss = db
    .prepare(
      "INSERT INTO boss_spawns (guildId,channelId,bossKey,maxHp,hp,spawnedAt,endsAt,lastHitUserId) VALUES (?,'c','b',100,50,1,2,'u')",
    )
    .run(guildId);
  db.prepare("INSERT INTO boss_damage VALUES (?,'u',50,1,1)").run(boss.lastInsertRowid);
  resetSeason(guildId, 'admin', 1000);
}

function snapshot() {
  return Object.fromEntries(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map(({ name }) => [name, db.prepare(`SELECT * FROM ${name}`).all()]),
  );
}

test.beforeEach(() => {
  db.exec('DROP TRIGGER IF EXISTS fail_reset');
  for (const table of Object.keys(snapshot()).sort(name => (name === 'season_stats' ? -1 : 0)))
    db.prepare(`DELETE FROM ${table}`).run();
  seed('g');
  seed('other');
  db.prepare("INSERT INTO bot_stats VALUES ('commands',123)").run();
});
test.after(() => db.close());

test('facade deletes every member table only in target guild and preserves archives and configuration', () => {
  const before = snapshot();
  const result = resetGuildMembers('g');
  const after = snapshot();
  const deleted = [
    'users',
    'points',
    'user_items',
    'quests',
    'give_daily',
    'voice_sessions',
    'weekly_points',
    'poruv_redemptions',
    'redeem_code_uses',
    'beta_reminders',
    'staff',
    'staff_activity',
    'staff_ratings',
  ];
  for (const table of deleted) {
    assert.equal(result[table], before[table].filter(row => row.guildId === 'g').length);
    assert.deepEqual(
      after[table],
      before[table].filter(row => row.guildId !== 'g'),
    );
  }
  assert.deepEqual(
    after.user_buffs,
    before.user_buffs.filter(row => row.guildId !== 'g' || row.userId === '*'),
  );
  const ids = before.boss_spawns.filter(row => row.guildId === 'g').map(row => row.id);
  assert.deepEqual(
    after.boss_damage,
    before.boss_damage.filter(row => !ids.includes(row.bossId)),
  );
  assert.deepEqual(
    after.boss_spawns,
    before.boss_spawns.map(row => (row.guildId === 'g' ? { ...row, lastHitUserId: null } : row)),
  );
  for (const table of [
    'seasons',
    'season_stats',
    'guild_config',
    'staff_divisi',
    'poruv_shop_items',
    'redeem_codes',
    'shop_items',
    'bot_stats',
  ])
    assert.deepEqual(after[table], before[table]);
});

test('failure rolls back every deletion including boss contributions', () => {
  const before = snapshot();
  db.exec("CREATE TRIGGER fail_reset BEFORE UPDATE ON boss_spawns BEGIN SELECT RAISE(ABORT,'injected'); END");
  assert.throws(() => resetGuildMembers('g'), /injected/);
  assert.deepEqual(snapshot(), before);
});

test('fresh voice persistence is atomic and cannot restore pre-reset times', () => {
  resetGuildMembers('g', [{ userId: 'u', joinedAt: 5000, lastGrant: 5000, eligible: true }]);
  assert.deepEqual(db.prepare("SELECT * FROM voice_sessions WHERE guildId='g'").all(), [
    { userId: 'u', guildId: 'g', joinedAt: 5000, lastGrant: 5000, eligible: 1 },
  ]);
  const before = snapshot();
  assert.throws(() => resetGuildMembers('g', [{ userId: 'u' }]));
  assert.deepEqual(snapshot(), before);
  assert.throws(() => resetGuildMembers(''));
});
