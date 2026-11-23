const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createProfileLevelServer, profileLevelConfig } = require('../src/lib/profileLevelApi');

const userId = '123456789012345678';
const guildId = '223456789012345678';
const otherGuild = '323456789012345678';
const key = 'test_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_random';
const query = `/api/profile-level?userId=${userId}&guildId=${guildId}`;
const env = { PROFILE_LEVEL_API_PORT: '3001', PROFILE_LEVEL_API_KEY: key, PROFILE_BOT_GUILD_IDS: guildId };

async function fixture(t, overrides = {}) {
  const calls = [];
  const server = createProfileLevelServer({ key, guildIds: [guildId], hasGuild: () => true, getLevel: (...args) => { calls.push(args); return 4; }, ...overrides });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path = query, options = {}) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path, method: 'GET', headers: { Authorization: `Bearer ${key}` }, ...options }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ code: res.statusCode, headers: res.headers, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.end();
  });
  return { request, calls };
}

test('optional configuration is loopback-only, explicit and independent', () => {
  assert.equal(profileLevelConfig({}), null);
  assert.equal(profileLevelConfig({ PROFILE_LEVEL_API_KEY: 'invalid' }), null);
  assert.deepEqual(profileLevelConfig(env), { key, host: '127.0.0.1', port: 3001, guildIds: [guildId] });
  for (const change of [
    { PROFILE_LEVEL_API_PORT: '0' }, { PROFILE_LEVEL_API_PORT: '65536' }, { PROFILE_LEVEL_API_PORT: '1.5' },
    { PROFILE_LEVEL_API_HOST: '0.0.0.0' }, { PROFILE_LEVEL_API_HOST: '192.168.1.10' },
    { PROFILE_LEVEL_API_KEY: '' }, { PROFILE_LEVEL_API_KEY: 'x'.repeat(64) },
    { PROFILE_BOT_GUILD_IDS: '' }, { PROFILE_BOT_GUILD_IDS: `${guildId},bad` },
    { PROFILE_BOT_API_KEY: key }, { DISCORD_TOKEN: key },
  ]) assert.throws(() => profileLevelConfig({ ...env, ...change }), /Invalid profile level API configuration/);
  assert.throws(() => createProfileLevelServer({ key, guildIds: [guildId], getLevel: () => 0 }), /Missing/);
});

test('authenticated reads are fresh, private, and scoped to user and guild', async t => {
  let level = 3;
  const calls = [];
  const { request } = await fixture(t, { getLevel: (...args) => { calls.push(args); return level; } });
  const response = await request();
  assert.equal(response.code, 200);
  assert.deepEqual(response.body, { status: 'ready', userId, guildId, level: 3 });
  assert.equal(response.headers['cache-control'], 'private, no-store');
  assert.equal(response.headers['access-control-allow-origin'], undefined);
  level = 0;
  assert.equal((await request()).body.level, 0);
  assert.deepEqual(calls, [[userId, guildId], [userId, guildId]]);
});

test('authentication never falls back to query, cookies, or other credentials', async t => {
  const { request, calls } = await fixture(t);
  for (const headers of [{}, { Authorization: `Basic ${key}` }, { Authorization: 'Bearer wrong' }, { Cookie: `key=${key}` }, { Authorization: [`Bearer ${key}`, `Bearer ${key}`] }]) {
    const response = await request(query, { headers });
    assert.equal(response.code, 401);
    assert.ok(!JSON.stringify(response).includes(key));
  }
  assert.equal((await request(`${query}&key=${key}`, { headers: {} })).code, 401);
  assert.deepEqual(calls, []);
});

test('strict method, route, query and snowflake validation precedes reads', async t => {
  const { request, calls } = await fixture(t);
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) assert.equal((await request(query, { method })).code, 405);
  assert.equal((await request('/wrong')).code, 404);
  for (const path of [
    '/api/profile-level', `/api/profile-level?userId=${userId}`, `${query}&extra=1`, `${query}&userId=${userId}`,
    `${query}&guildId=${guildId}`, `/api/profile-level?userId=../bad&guildId=${guildId}`,
    `/api/profile-level?userId=99999999999999999999&guildId=${guildId}`,
    `/api/profile-level?userId=012345678901234567&guildId=${guildId}`,
    `/api/profile-level?userId=${userId}&guildId=bad`, `${query}#fragment`,
  ]) assert.equal((await request(path)).code, 400, path);
  assert.deepEqual(calls, []);
});

test('registry and current bot guild membership are both required', async t => {
  let present = true;
  const { request, calls } = await fixture(t, { hasGuild: () => present });
  assert.equal((await request(query.replace(guildId, otherGuild))).code, 403);
  assert.equal((await request()).code, 200);
  present = false;
  assert.equal((await request()).code, 403);
  assert.equal(calls.length, 1);
});

test('invalid levels and dependency failures return generic errors', async t => {
  let value;
  const { request } = await fixture(t, { getLevel: () => { if (value instanceof Error) throw value; return value; } });
  for (value of [undefined, null, -1, 1.5, '3', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, new Error(key)]) {
    const response = await request();
    assert.equal(response.code, 503);
    assert.deepEqual(response.body, { status: 'error', error: 'unavailable' });
  }
});

test('timeouts are bounded and outstanding work cannot accumulate without limit', async t => {
  let calls = 0;
  const { request } = await fixture(t, { timeoutMs: 15, getLevel: () => { calls++; return new Promise(() => {}); } });
  for (let i = 0; i < 10; i++) assert.equal((await request()).code, 503);
  assert.equal(calls, 8);
});

test('process-wide bounded rate limit includes unauthenticated requests', async t => {
  const { request, calls } = await fixture(t, { rateLimit: 2 });
  assert.equal((await request(query, { headers: {} })).code, 401);
  assert.equal((await request()).code, 200);
  assert.equal((await request()).code, 429);
  assert.equal(calls.length, 1);
});

test('read-only facade selects existing level and defaults only absent rows to zero', t => {
  const connectionPath = require.resolve('../src/database/connection');
  const facadePath = require.resolve('../src/database');
  const originalConnection = require.cache[connectionPath];
  const originalFacade = require.cache[facadePath];
  let row;
  const reads = [];
  require.cache[connectionPath] = { id: connectionPath, filename: connectionPath, loaded: true, exports: { db: {
    prepare(sql) {
      return { get(...args) { reads.push([sql, ...args]); return row; } };
    },
  } } };
  const schemaPath = require.resolve('../src/database/schema');
  const shopPath = require.resolve('../src/database/shop');
  const originalSchema = require.cache[schemaPath];
  const originalShop = require.cache[shopPath];
  require.cache[schemaPath] = { exports: { createTables() {}, runMigrations() {} } };
  require.cache[shopPath] = { exports: { seedShop() {}, syncEffects() {}, rebalancePrices() {}, grantItem() {}, getShopItems() {} } };
  t.after(() => {
    for (const [path, original] of [[connectionPath, originalConnection], [facadePath, originalFacade], [schemaPath, originalSchema], [shopPath, originalShop]]) {
      if (original) require.cache[path] = original;
      else delete require.cache[path];
    }
  });
  delete require.cache[facadePath];
  const { getProfileLevel } = require('../src/database');
  assert.equal(getProfileLevel(userId, guildId), 0);
  row = { level: 7 };
  assert.equal(getProfileLevel(userId, guildId), 7);
  row = { level: null };
  assert.equal(getProfileLevel(userId, guildId), null);
  assert.deepEqual(reads, Array(3).fill(['SELECT level FROM points WHERE userId = ? AND guildId = ?', userId, guildId]));
});
