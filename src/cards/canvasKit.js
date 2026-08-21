const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const FALLBACK_COLOR = '#5865f2';
const AVATAR_TIMEOUT_MS = 6000;
const AVATAR_RETRIES = 2;

// @napi-rs/canvas tidak support GIF — paksa semua avatar jadi PNG
function normalizeToPng(url) {
  if (!url) return url;
  return url.replace(/\.gif(\?|$)/i, '.png$1');
}

const { AVATAR_CACHE_DIR: CACHE_DIR } = require('../lib/paths');
fs.mkdirSync(CACHE_DIR, { recursive: true });

function cachePath(url) {
  const hash = crypto.createHash('sha1').update(url).digest('hex');
  return path.join(CACHE_DIR, `${hash}.png`);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function fallbackAvatar(name = '', size = 128) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');
  const { r, g, b } = hexToRgb(FALLBACK_COLOR);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size / 2}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((name || '?').charAt(0).toUpperCase(), size / 2, size / 2);
  return c;
}

async function fetchAvatarBuffer(url) {
  if (!url) throw new Error('URL avatar kosong');
  url = normalizeToPng(url);
  let lastErr;
  for (let attempt = 0; attempt <= AVATAR_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(AVATAR_TIMEOUT_MS),
        headers: { Accept: 'image/png,image/jpeg,image/webp,image/*' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      lastErr = error;
      if (attempt < AVATAR_RETRIES) await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function loadAvatar(url, name = '', size = 128) {
  try {
    if (!url) return fallbackAvatar(name, size);
    url = normalizeToPng(url);
    const cached = cachePath(url);
    let buffer;
    if (fs.existsSync(cached)) {
      buffer = fs.readFileSync(cached);
      // Invalidasi cache kalau isinya GIF (magic bytes 47 49 46 = 'GIF')
      if (buffer.length >= 3 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
        fs.unlinkSync(cached);
        buffer = null;
      }
    }
    if (!buffer) {
      buffer = await fetchAvatarBuffer(url);
      try {
        fs.writeFileSync(cached, buffer);
      } catch (error) {
        console.error('Gagal tulis cache avatar:', error.message);
      }
    }
    return await loadImage(buffer);
  } catch (error) {
    console.error(`Avatar gagal di-load (${url}):`, error.message);
    return fallbackAvatar(name, size);
  }
}

/**
 * Tulis teks yang pasti muat di lebar `maxWidth`: font dikecilkan bertahap
 * sampai batas `minSize`, baru sisanya dipotong dengan elipsis.
 * Mengembalikan lebar teks yang tergambar.
 */
function fitText(ctx, text, x, y, maxWidth, { weight = 'bold', size = 28, minSize = 14, family = 'sans-serif' } = {}) {
  let current = size;
  const setFont = s => { ctx.font = `${weight} ${s}px ${family}`.trim(); };
  setFont(current);
  let value = String(text ?? '');
  while (ctx.measureText(value).width > maxWidth && current > minSize) {
    current -= 1;
    setFont(current);
  }
  while (value.length > 1 && ctx.measureText(value + '…').width > maxWidth) {
    value = value.slice(0, -1);
  }
  if (ctx.measureText(String(text ?? '')).width > maxWidth) value += '…';
  ctx.fillText(value, x, y);
  return { width: ctx.measureText(value).width, fontSize: current };
}

module.exports = { roundRect, hexToRgb, fetchAvatarBuffer, loadAvatar, fitText };