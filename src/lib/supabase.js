const { allowedBackground, imageMetadata, decodeBackgroundImage, MAX_OUTPUT_BYTES } = require('./profileBackground');
const { URLSearchParams } = require('node:url');
const { clearTimeout } = require('node:timers');
const { AbortController } = globalThis;
const BACKGROUND_TIMEOUT_MS = 10000;

function dashboardConfig(env = process.env) {
  try {
    const url = new URL(env.PROFILE_DASHBOARD_URL);
    const key = env.PROFILE_BOT_API_KEY;
    const localDevelopment = env.NODE_ENV === 'development' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !localDevelopment) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    if (!key || !/^[A-Za-z0-9_-]{32,256}$/.test(key) || new Set(key).size < 16) return null;
    return { origin: url.origin, key };
  } catch { return null; }
}

async function readLimited(response, limit, signal) {
  if (!response.ok || response.redirected || !response.body || Number(response.headers.get('content-length')) > limit) return null;
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  const chunks = [];
  let size = 0;
  try {
    if (signal.aborted) return null;
    while (true) {
      const { value, done } = await reader.read();
      if (signal.aborted) return null;
      if (done) break;
      size += value.byteLength;
      if (size > limit) { cancel(); return null; }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

async function getUserBackground(userId, guildId, dependencies = {}) {
  const config = dashboardConfig(dependencies.env);
  if (!config || !/^[1-9]\d{16,19}$/.test(userId) || !/^[1-9]\d{16,19}$/.test(guildId)) return null;
  const controller = new AbortController();
  const timeoutMs = Number.isInteger(dependencies.timeoutMs) && dependencies.timeoutMs >= 1 && dependencies.timeoutMs <= BACKGROUND_TIMEOUT_MS
    ? dependencies.timeoutMs : BACKGROUND_TIMEOUT_MS;
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const url = new URL('/api/bot/preferences', config.origin);
        url.search = new URLSearchParams({ guildId, userId }).toString();
        const response = await (dependencies.fetch ?? fetch)(url, {
          headers: { Authorization: `Bearer ${config.key}`, Accept: 'application/json' },
          signal: controller.signal, cache: 'no-store', redirect: 'error',
        });
        if (!response.ok || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '')) return null;
        const json = await readLimited(response, 4096, controller.signal);
        if (!json) return null;
        const data = JSON.parse(json.toString('utf8'));
        if (!data || data.status !== 'ready' || !data.background || data.background.id !== data.backgroundId) return null;
        if (data.background.kind !== 'image') return allowedBackground(data.background);
        const background = imageMetadata(data.background, dependencies.level);
        if (!background || controller.signal.aborted) return null;
        const mediaUrl = new URL(`/api/bot/backgrounds/${background.id}/media`, config.origin);
        mediaUrl.search = new URLSearchParams({ userId, guildId, revision: String(background.revision) }).toString();
        const media = await (dependencies.fetch ?? fetch)(mediaUrl, {
          headers: { Authorization: `Bearer ${config.key}`, Accept: 'image/png' },
          signal: controller.signal, cache: 'no-store', redirect: 'error',
        });
        if (!/^image\/png(?:;|$)/i.test(media.headers.get('content-type') ?? '')) return null;
        const buffer = await readLimited(media, MAX_OUTPUT_BYTES, controller.signal);
        if (!buffer || !await decodeBackgroundImage(buffer) || controller.signal.aborted) return null;
        return { ...background, buffer };
      })(),
      new Promise(resolve => {
        timer = setTimeout(() => { controller.abort(); resolve(null); }, timeoutMs);
      }),
    ]);
  } catch { return null; }
  finally { clearTimeout(timer); }
}

module.exports = { dashboardConfig, getUserBackground };
