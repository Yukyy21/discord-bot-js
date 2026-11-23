const http = require('node:http');
const { TextDecoder } = require('node:util');
const { createHash, timingSafeEqual } = require('node:crypto');
const { clearTimeout } = require('node:timers');

function isSnowflake(value) {
  return typeof value === 'string' && /^[1-9]\d{16,19}$/.test(value) && BigInt(value) <= 18446744073709551615n;
}

function profileLevelConfig(env = process.env) {
  if (!env.PROFILE_LEVEL_API_PORT) return null;
  const key = env.PROFILE_LEVEL_API_KEY;
  const host = env.PROFILE_LEVEL_API_HOST || '127.0.0.1';
  const port = env.PROFILE_LEVEL_API_PORT;
  const guildIds = (env.PROFILE_BOT_GUILD_IDS || '').split(',').map(id => id.trim());
  if (!/^[1-9]\d{0,4}$/.test(port) || Number(port) > 65535 ||
      !['127.0.0.1', '::1', 'localhost'].includes(host) ||
      !key || !/^[A-Za-z0-9_-]{32,256}$/.test(key) || new Set(key).size < 16 ||
      [env.PROFILE_BOT_API_KEY, env.DISCORD_TOKEN].includes(key) ||
      !guildIds.length || !guildIds.every(isSnowflake)) {
    throw new Error('Invalid profile level API configuration');
  }
  return { key, host, port: Number(port), guildIds };
}

function createProfileLevelServer({ key, guildIds, getLevel, hasGuild, renderPreview, timeoutMs = 2000, renderTimeoutMs = 15000, rateLimit = 120, windowMs = 60000 }) {
  profileLevelConfig({ PROFILE_LEVEL_API_PORT: '1', PROFILE_LEVEL_API_KEY: key, PROFILE_BOT_GUILD_IDS: guildIds?.join(',') });
  if (typeof getLevel !== 'function' || typeof hasGuild !== 'function') throw new Error('Missing profile level API dependencies');
  const registry = new Set(guildIds);
  const digest = value => createHash('sha256').update(value).digest();
  const expected = digest(`Bearer ${key}`);
  let windowStart = Date.now();
  let requests = 0;
  let active = 0;
  let rendering = 0;
  const server = http.createServer({ maxHeaderSize: 8192 }, async (req, res) => {
    const send = (code, body) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', Connection: 'close' });
      res.end(JSON.stringify(body));
    };
    const error = (code, reason) => send(code, { status: 'error', error: reason });
    if (Date.now() - windowStart >= windowMs) { windowStart = Date.now(); requests = 0; }
    if (++requests > rateLimit) return error(429, 'rate_limited');
    const authHeaders = req.rawHeaders.filter((_value, index) => index % 2 === 0 && req.rawHeaders[index].toLowerCase() === 'authorization');
    if (authHeaders.length !== 1 || !timingSafeEqual(expected, digest(req.headers.authorization || ''))) return error(401, 'unauthorized');
    if (req.url === '/api/profile-preview') {
      if (req.method !== 'POST') return error(405, 'method_not_allowed');
      if (typeof renderPreview !== 'function') return error(503, 'unavailable');
      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || '') || req.headers['content-encoding']) return error(400, 'invalid_body');
      const maxBody = 3075072;
      const length = req.headers['content-length'];
      if (length && (!/^\d+$/.test(length) || Number(length) > maxBody)) return error(413, 'body_too_large');
      if (rendering >= 2) return error(503, 'busy');
      rendering++;
      const controller = new globalThis.AbortController();
      const timer = setTimeout(() => { controller.abort(); error(503, 'unavailable'); req.destroy(); }, renderTimeoutMs);
      res.on('close', () => { if (!res.writableEnded) controller.abort(); });
      req.setTimeout(renderTimeoutMs);
      try {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > maxBody) { error(413, 'body_too_large'); return; }
          chunks.push(chunk);
        }
        let body;
        try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
        catch { return error(400, 'invalid_body'); }
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).sort().join(',') !== 'background,guildId,userId'
            || !isSnowflake(body.userId) || !isSnowflake(body.guildId)) return error(400, 'invalid_body');
        if (!registry.has(body.guildId) || await hasGuild(body.guildId) !== true) return error(403, 'guild_unavailable');
        controller.signal.throwIfAborted();
        const png = await renderPreview(body, controller.signal);
        controller.signal.throwIfAborted();
        const { decodeBackgroundImage } = require('./profileBackground');
        if (!await decodeBackgroundImage(png)) throw new Error('Invalid PNG');
        if (!res.destroyed && !res.writableEnded) {
          res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': png.length, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', Connection: 'close' });
          res.end(png);
        }
      } catch (failure) { error([400, 403].includes(failure.code) ? failure.code : 503, [400, 403].includes(failure.code) ? failure.reason : 'unavailable'); }
      finally { clearTimeout(timer); rendering--; }
      return;
    }
    if (req.method !== 'GET') return error(405, 'method_not_allowed');
    let url;
    try {
      if (!req.url.startsWith('/') || req.url.startsWith('//') || req.url.includes('#')) return error(400, 'invalid_query');
      url = new URL(req.url, 'http://localhost');
    } catch { return error(400, 'invalid_query'); }
    if (url.pathname !== '/api/profile-level') return error(404, 'not_found');
    const entries = [...url.searchParams];
    const userId = url.searchParams.get('userId');
    const guildId = url.searchParams.get('guildId');
    if (entries.length !== 2 || new Set(entries.map(([name]) => name)).size !== 2 || !isSnowflake(userId) || !isSnowflake(guildId)) return error(400, 'invalid_query');
    if (!registry.has(guildId)) return error(403, 'guild_unavailable');
    if (active >= 8) return error(503, 'unavailable');
    active++;
    let timer;
    try {
      const work = (async () => {
        try {
          if (await hasGuild(guildId) !== true) return { code: 403, body: { status: 'error', error: 'guild_unavailable' } };
          const level = await getLevel(userId, guildId);
          if (!Number.isSafeInteger(level) || level < 0) throw new Error('Invalid level');
          return { code: 200, body: { status: 'ready', userId, guildId, level } };
        } finally { active--; }
      })();
      const result = await Promise.race([
        work,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs); }),
      ]);
      send(result.code, result.body);
    } catch { error(503, 'unavailable'); }
    finally { clearTimeout(timer); }
  });
  server.requestTimeout = 20000;
  server.headersTimeout = 5000;
  server.timeout = 20000;
  server.keepAliveTimeout = 1000;
  server.maxConnections = 64;
  server.on('clientError', (_error, socket) => socket.destroy());
  return server;
}

module.exports = { createProfileLevelServer, profileLevelConfig };
