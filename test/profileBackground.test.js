const test = require('node:test');
const assert = require('node:assert/strict');
const { Response, ReadableStream } = globalThis;
const { getUserBackground, dashboardConfig } = require('../src/lib/supabase');
const { allowedBackground, MAX_OUTPUT_BYTES } = require('../src/lib/profileBackground');
const { createCanvas } = require('@napi-rs/canvas');
const { createServer } = require('node:http');
const { setTimeout: delay } = require('node:timers/promises');

const imageBackground = { id: 'c4a0cb0d-601a-41f6-b37a-a46a1170aafe', kind: 'image', revision: 2, mime: 'image/png', width: 1000, height: 560, slot: 1 };
const imageCanvas = createCanvas(1000, 560);
imageCanvas.getContext('2d').fillStyle = '#ff0000';
imageCanvas.getContext('2d').fillRect(0, 0, 1000, 560);
const imageBuffer = imageCanvas.toBuffer('image/png');
const imageReady = (value = imageBackground) => Response.json({ status: 'ready', backgroundId: value.id, background: value });
const internalImage = (value = imageBackground) => ({ id: value.id, kind: 'image', revision: value.revision, slot: value.slot, buffer: imageBuffer });

const user = '123456789012345678';
const guild = '223456789012345678';
const env = { PROFILE_DASHBOARD_URL: 'https://dashboard.example', PROFILE_BOT_API_KEY: 'test_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_random' };
const background = { id: 'sample-plum', color: '#352442' };
const ready = () => Response.json({ status: 'ready', backgroundId: background.id, background });

test('dashboard config only permits fixed HTTPS origin and strong credential shape', () => {
  assert.ok(dashboardConfig(env));
  for (const url of ['http://localhost:3000', 'https://user:pass@example.com', 'https://example.com/path', 'https://example.com/?x=y']) {
    assert.equal(dashboardConfig({ ...env, PROFILE_DASHBOARD_URL: url }), null);
  }
  assert.equal(dashboardConfig({ ...env, PROFILE_BOT_API_KEY: 'x'.repeat(32) }), null);
  assert.equal(dashboardConfig({ SUPABASE_URL: 'https://database.example', SUPABASE_SERVICE_ROLE_KEY: 'not-used' }), null);
});

test('HTTP loopback requires explicit development mode and still validates the origin', () => {
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000']) {
    assert.ok(dashboardConfig({ ...env, NODE_ENV: 'development', PROFILE_DASHBOARD_URL: origin }));
    for (const mode of ['production', 'test', undefined]) {
      assert.equal(dashboardConfig({ ...env, NODE_ENV: mode, PROFILE_DASHBOARD_URL: origin }), null);
    }
  }
  for (const origin of ['http://192.168.1.10:3000', 'http://example.com', 'http://localhost.example.com', 'http://user:pass@localhost:3000', 'http://localhost:3000/path', 'http://localhost:3000/?key=x', 'http://localhost:3000/#fragment']) {
    assert.equal(dashboardConfig({ ...env, NODE_ENV: 'development', PROFILE_DASHBOARD_URL: origin }), null);
  }
});

test('development lookup reaches loopback with the shared credential', async () => {
  const localEnv = { ...env, NODE_ENV: 'development', PROFILE_DASHBOARD_URL: 'http://127.0.0.1:3000' };
  assert.deepEqual(await getUserBackground(user, guild, { env: localEnv, fetch: async (input, init) => {
    assert.equal(new URL(input).origin, localEnv.PROFILE_DASHBOARD_URL);
    assert.equal(init.headers.Authorization, `Bearer ${env.PROFILE_BOT_API_KEY}`);
    return ready();
  } }), background);
});

test('fresh authenticated requests use no-store, no redirect and never reuse pre-reset choice', async () => {
  let calls = 0;
  const fetch = async (input, init) => {
    calls++;
    const url = new URL(input);
    assert.equal(url.pathname, '/api/bot/preferences');
    assert.equal(url.searchParams.get('userId'), user);
    assert.equal(url.searchParams.get('guildId'), guild);
    assert.equal(init.headers.Authorization, `Bearer ${env.PROFILE_BOT_API_KEY}`);
    assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error'); assert.ok(init.signal);
    return calls === 1 ? ready() : Response.json({ status: 'ready', backgroundId: null, background: null });
  };
  assert.deepEqual(await getUserBackground(user, guild, { env, fetch }), background);
  assert.equal(await getUserBackground(user, guild, { env, fetch }), null);
  assert.equal(calls, 2);
});

test('401, 429, server failure, malformed JSON and unknown assets fall back without retries', async () => {
  const cases = [
    () => new Response('private', { status: 401 }),
    () => new Response('private', { status: 429 }),
    () => new Response('private', { status: 503 }),
    () => new Response('{', { headers: { 'content-type': 'application/json' } }),
    () => Response.json({ status: 'ready', backgroundId: 'unknown', background: { id: 'unknown', color: '#ffffff' } }),
    () => Response.json({ status: 'ready', backgroundId: background.id, background: { ...background, asset_key: '/private' } }),
    () => Response.json({ status: 'ready', backgroundId: 'sample-carbon', background }),
    () => Response.json({ status: 'offline', backgroundId: background.id, background }),
    () => { throw new Error('private credential'); },
    () => new Response('x'.repeat(4097), { headers: { 'content-type': 'application/json' } }),
  ];
  for (const response of cases) {
    let calls = 0;
    assert.equal(await getUserBackground(user, guild, { env, fetch: async () => { calls++; return response(); } }), null);
    assert.equal(calls, 1);
  }
  assert.equal(await getUserBackground('../bad', guild, { env, fetch: () => assert.fail('must not fetch') }), null);
});

test('configured timeout caps a stalled preference body, aborts and cancels without retries', async () => {
  let signal;
  let calls = 0;
  let cancelled = false;
  const started = Date.now();
  assert.equal(await getUserBackground(user, guild, { env, timeoutMs: 40, fetch: async (_url, init) => {
    calls++;
    signal = init.signal;
    return new Response(new ReadableStream({ cancel() { cancelled = true; } }), { headers: { 'content-type': 'application/json' } });
  } }), null);
  assert.equal(signal.aborted, true);
  assert.equal(cancelled, true);
  assert.equal(calls, 1);
  assert.ok(Date.now() - started < 1000);
});

test('private PNG download uses only the configured origin and fresh authenticated requests', async t => {
  let calls = 0;
  const server = createServer((req, res) => {
    calls++;
    const url = new URL(req.url, 'http://localhost');
    assert.equal(req.headers.authorization, `Bearer ${env.PROFILE_BOT_API_KEY}`);
    assert.equal(url.searchParams.get('userId'), user);
    assert.equal(url.searchParams.get('guildId'), guild);
    if (url.pathname === '/api/bot/preferences') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ status: 'ready', backgroundId: imageBackground.id, background: imageBackground }));
    } else {
      assert.equal(url.pathname, `/api/bot/backgrounds/${imageBackground.id}/media`);
      assert.equal(url.searchParams.get('revision'), '2');
      res.setHeader('content-type', 'image/png');
      res.end(imageBuffer);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const localEnv = { ...env, NODE_ENV: 'development', PROFILE_DASHBOARD_URL: `http://127.0.0.1:${server.address().port}` };
  assert.deepEqual(await getUserBackground(user, guild, { env: localEnv, level: 20, fetch: (url, init) => {
    assert.equal(init.redirect, 'error');
    assert.equal(init.cache, 'no-store');
    return fetch(url, init);
  } }), internalImage());
  assert.equal(calls, 2);
});

test('image slots require the current trusted level on every lookup', async () => {
  for (const [slot, threshold] of [[1, 20], [2, 45], [3, 65]]) {
    for (const level of [threshold, threshold - 1, undefined, null, '65', NaN, Infinity, -1, 65.5]) {
      let calls = 0;
      const value = { ...imageBackground, slot };
      const result = await getUserBackground(user, guild, { env, level, fetch: async () => ++calls === 1 ? imageReady(value) : new Response(imageBuffer, { headers: { 'content-type': 'image/png' } }) });
      assert.deepEqual(result, level === threshold ? internalImage(value) : null);
      assert.equal(calls, level === threshold ? 2 : 1);
    }
  }
  for (const patch of [{ id: '../media' }, { slot: 0 }, { slot: 4 }, { revision: 0 }, { revision: 1.5 }, { mime: 'image/jpeg' }, { width: 1001 }, { height: 559 }, { url: 'https://external.example' }]) {
    let calls = 0;
    assert.equal(await getUserBackground(user, guild, { env, level: 100, fetch: async () => { calls++; return imageReady({ ...imageBackground, ...patch }); } }), null);
    assert.equal(calls, 1);
  }
});

test('invalid media MIME, bytes, dimensions, decode, size, status and redirects fall back', async () => {
  const corrupt = Buffer.from(imageBuffer.subarray(0, 33));
  const tooWide = createCanvas(1001, 560).toBuffer('image/png');
  const cases = [
    () => new Response(imageBuffer, { headers: { 'content-type': 'image/jpeg' } }),
    () => new Response('not png', { headers: { 'content-type': 'image/png' } }),
    () => new Response(corrupt, { headers: { 'content-type': 'image/png' } }),
    () => new Response(tooWide, { headers: { 'content-type': 'image/png' } }),
    () => new Response(imageBuffer, { headers: { 'content-type': 'image/png', 'content-length': String(MAX_OUTPUT_BYTES + 1) } }),
    () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_OUTPUT_BYTES)); controller.enqueue(new Uint8Array(1)); controller.close(); } }), { headers: { 'content-type': 'image/png' } }),
    () => new Response(null, { status: 302, headers: { location: 'https://external.example', 'content-type': 'image/png' } }),
    () => new Response(null, { status: 403, headers: { 'content-type': 'image/png' } }),
    () => { throw new Error('redirect rejected'); },
  ];
  for (const response of cases) {
    let calls = 0;
    assert.equal(await getUserBackground(user, guild, { env, level: 20, fetch: async () => ++calls === 1 ? imageReady() : response() }), null);
    assert.equal(calls, 2);
  }
});

test('default ten-second deadline permits delayed preferences and PNG media beyond two seconds', async () => {
  let calls = 0;
  let signal;
  const started = Date.now();
  const result = await getUserBackground(user, guild, { env, level: 20, fetch: async (_url, init) => {
    signal = init.signal;
    if (++calls === 1) { await delay(20); return imageReady(); }
    await delay(2100);
    return new Response(imageBuffer, { headers: { 'content-type': 'image/png' } });
  } });
  assert.deepEqual(result, internalImage());
  assert.equal(signal.aborted, false);
  assert.equal(calls, 2);
  assert.ok(Date.now() - started > 2000);
});

test('lookup and media share one configured deadline including a stalled download', async () => {
  let calls = 0;
  let signal;
  let cancelled = false;
  const started = Date.now();
  assert.equal(await getUserBackground(user, guild, { env, level: 20, timeoutMs: 40, fetch: async (_url, init) => {
    if (signal) assert.equal(init.signal, signal);
    signal = init.signal;
    if (++calls === 1) { await delay(10); return imageReady(); }
    return new Response(new ReadableStream({ cancel() { cancelled = true; } }), { headers: { 'content-type': 'image/png' } });
  } }), null);
  assert.equal(signal.aborted, true);
  assert.equal(cancelled, true);
  assert.equal(calls, 2);
  assert.ok(Date.now() - started < 1000);
});

test('configured deadline bounds a stalled request even if fetch ignores abort', async () => {
  let calls = 0;
  let signal;
  const started = Date.now();
  assert.equal(await getUserBackground(user, guild, { env, timeoutMs: 40, fetch: (_url, init) => {
    calls++;
    signal = init.signal;
    return new Promise(() => {});
  } }), null);
  assert.equal(signal.aborted, true);
  assert.equal(calls, 1);
  assert.ok(Date.now() - started < 1000);
});

test('timeout override only accepts integers from one through ten thousand milliseconds', async () => {
  for (const timeoutMs of [undefined, null, 0, -1, 1.5, '40', NaN, Infinity, 10001]) {
    assert.deepEqual(await getUserBackground(user, guild, { env, timeoutMs, fetch: async () => {
      await delay(10);
      return ready();
    } }), background);
  }
  for (const timeoutMs of [1, 10000]) {
    assert.deepEqual(await getUserBackground(user, guild, { env, timeoutMs, fetch: async () => ready() }), background);
  }
});

test('renderer rechecks level and rejects non-buffer, corrupt and arbitrary image sources', async () => {
  const { buildProfileCard } = require('../src/cards/profileCard');
  const options = { username: 'Test', level: 20, xp: 0, xpNeeded: 100 };
  const fallback = await buildProfileCard(options);
  assert.notDeepEqual(await buildProfileCard({ ...options, background: internalImage() }), fallback);
  for (const patch of [{ buffer: imageBuffer.toString('base64') }, { buffer: new Uint8Array(imageBuffer) }, { buffer: Buffer.from('bad') }, { buffer: imageBuffer.subarray(0, 33) }, { id: '../path' }, { revision: 0 }, { slot: 2 }, { url: 'https://external.example' }, { color: '#ffffff' }]) {
    assert.deepEqual(await buildProfileCard({ ...options, background: { ...internalImage(), ...patch } }), fallback);
  }
  const downgraded = { ...options, level: 19 };
  assert.deepEqual(await buildProfileCard({ ...downgraded, background: internalImage() }), await buildProfileCard(downgraded));
});

test('renderer guard rejects arbitrary color, paths and unknown IDs', () => {
  for (const value of [null, {}, { color: '#ffffff' }, { id: '../../file', color: '#352442' }, { ...background, color: '#ffffff' }, { ...background, url: 'https://external.example' }]) assert.equal(allowedBackground(value), null);
  assert.deepEqual(allowedBackground(background), background);
});

test('profile renderer returns PNG for default, valid and rejected custom backgrounds', async () => {
  const { buildProfileCard } = require('../src/cards/profileCard');
  const images = [];
  for (const custom of [null, background, { id: 'unknown', color: '#ffffff', asset_key: '/private' }]) {
    const png = await buildProfileCard({ username: 'Test', level: 1, xp: 0, xpNeeded: 100, background: custom });
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    images.push(png);
  }
  assert.deepEqual(images[0], images[2]);
  assert.notDeepEqual(images[0], images[1]);
});
