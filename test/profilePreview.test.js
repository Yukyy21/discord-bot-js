const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { createCanvas } = require('@napi-rs/canvas');
const { readProfileSnapshot, renderProfilePreview } = require('../src/lib/profilePreview');
const { createProfileLevelServer } = require('../src/lib/profileLevelApi');

const userId = '123456789012345678';
const guildId = '223456789012345678';
const key = 'test_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_random';
function database() {
  const db = new Database(':memory:');
  db.exec('CREATE TABLE users(userId TEXT, guildId TEXT, balance INTEGER, bank INTEGER, streak INTEGER); CREATE TABLE points(userId TEXT, guildId TEXT, points INTEGER, level INTEGER, xp INTEGER)');
  return db;
}
function client(fetchMember = async () => ({ id: userId, guild: { id: guildId }, user: { displayName: 'Test', displayAvatarURL: () => undefined } })) {
  return { isReady: () => true, guilds: { cache: new Map([[guildId, { members: { fetch: fetchMember } }]]) } };
}

test('snapshot is SELECT-only, preserves counts and defaults like a newly initialized profile', () => {
  const db = database();
  db.exec(`INSERT INTO points VALUES ('other', '${guildId}', 20, 5, 4)`);
  db.pragma('query_only = ON');
  assert.deepEqual(readProfileSnapshot(db, userId, guildId), { balance: 0, bank: 0, streak: 0, points: 0, level: 0, xp: 0, rank: 2 });
  assert.equal(db.prepare('SELECT count(*) n FROM users').get().n, 0);
  assert.equal(db.prepare('SELECT count(*) n FROM points').get().n, 1);
  db.close();
});

test('default and solid reuse the actual renderer without writes; custom slots and corrupt images fail closed', async () => {
  const db = database();
  db.pragma('query_only = ON');
  const dependencies = { db, client: client() };
  const png = await renderProfilePreview({ userId, guildId, background: null }, dependencies);
  assert.equal(png.readUInt32BE(16), 1000);
  assert.equal(png.readUInt32BE(20), 560);
  const solid = await renderProfilePreview({ userId, guildId, background: { id: 'sample-plum', color: '#352442' } }, dependencies);
  assert.notDeepEqual(png, solid);
  for (const background of [{ id: 'sample-plum', color: '#ffffff' }, { id: '12345678-1234-4234-8234-123456789abc', kind: 'image', slot: 1, revision: 1, base64: createCanvas(1000, 560).toBuffer('image/png').toString('base64') }, { kind: 'image', base64: 'bad' }]) {
    await assert.rejects(renderProfilePreview({ userId, guildId, background }, dependencies), { code: 400 });
  }
  assert.equal(db.prepare('SELECT count(*) n FROM points').get().n, 0);
  db.pragma('query_only = OFF');
  db.prepare('INSERT INTO points VALUES (?, ?, 0, 20, 0)').run(userId, guildId);
  db.pragma('query_only = ON');
  const custom = { id: '12345678-1234-4234-8234-123456789abc', kind: 'image', slot: 1, revision: 1, base64: createCanvas(1000, 560).toBuffer('image/png').toString('base64') };
  const actual = await renderProfilePreview({ userId, guildId, background: custom }, dependencies);
  assert.equal(actual.readUInt32BE(16), 1000);
  await assert.rejects(renderProfilePreview({ userId, guildId, background: { ...custom, base64: Buffer.alloc(33).toString('base64') } }, dependencies), { code: 400 });
  await assert.rejects(renderProfilePreview({ userId, guildId, background: null }, { db, client: client(async () => { throw new Error(); }) }), { code: 403 });
  db.close();
});

test('render route authenticates, enforces registry and bounded strict JSON with no-store PNG', async t => {
  let renders = 0;
  const server = createProfileLevelServer({ key, guildIds: [guildId], getLevel: () => 0, hasGuild: () => true, renderPreview: async () => { renders++; return createCanvas(1000, 560).toBuffer('image/png'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/profile-preview`;
  const request = (body, auth = key, headers = {}) => fetch(url, { method: 'POST', headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const body = { userId, guildId, background: null };
  assert.equal((await request(body, 'bad')).status, 401);
  assert.equal((await request({ ...body, guildId: userId })).status, 403);
  assert.equal((await request({ ...body, stats: {} })).status, 400);
  const oversized = await new Promise((resolve, reject) => {
    const req = require('node:http').request(url, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'content-length': '3075073' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject);
    req.end();
  });
  assert.equal(oversized, 413);
  const response = await request(body);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(renders, 1);
});

test('render concurrency stays capped after deadline while dependencies are unresolved', async t => {
  let calls = 0;
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const server = createProfileLevelServer({ key, guildIds: [guildId], getLevel: () => 0, hasGuild: () => true, renderTimeoutMs: 30, renderPreview: async () => { calls++; await blocked; return createCanvas(1000, 560).toBuffer('image/png'); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { release(); return new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}/api/profile-preview`;
  const send = () => fetch(url, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ userId, guildId, background: null }) }).catch(() => null);
  await Promise.all([send(), send()]);
  assert.equal(calls, 2);
  assert.equal((await send()).status, 503);
  assert.equal(calls, 2);
});
