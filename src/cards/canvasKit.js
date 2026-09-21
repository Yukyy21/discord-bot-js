const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const logger = require('../lib/logger');
const { FONT } = require('../lib/fonts'); // side-effect: registerFonts() jalan sekali di sini

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

/**
 * Gambar background image "cover" — di-crop & di-scale rata (rasio ASLI
 * dipertahankan, TIDAK di-stretch), persis kayak CSS `background-size:
 * cover`. Pakai ini, JANGAN `ctx.drawImage(img, 0, 0, w, h)` polos — itu
 * maksa gambar mengikuti rasio kanvas apa adanya dan bikin isinya gepeng
 * kalau rasio sumbernya beda (kejadian di leaderboard: source-nya potret
 * tinggi, kanvasnya landscape lebar → planet2 di background jadi lonjong).
 * `anchor` (0-1, default tengah) geser titik crop kalau bagian penting
 * gambar condong ke satu sisi — mis. anchorY: 1 buat nampilin bagian BAWAH
 * gambar (dipakai leaderboard.jpeg yang lengkungan buminya di bawah).
 */
function drawCover(ctx, img, x, y, w, h, { anchorX = 0.5, anchorY = 0.5 } = {}) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) * anchorX;
  const sy = (img.height - sh) * anchorY;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
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
  ctx.font = `bold ${size / 2}px ${FONT.display}`;
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
        logger.error('Gagal tulis cache avatar:', error.message);
      }
    }
    return await loadImage(buffer);
  } catch (error) {
    logger.error(`Avatar gagal di-load (${url}):`, error.message);
    return fallbackAvatar(name, size);
  }
}

/**
 * Tulis teks yang pasti muat di lebar `maxWidth`: font dikecilkan bertahap
 * sampai batas `minSize`, baru sisanya dipotong dengan elipsis.
 * Mengembalikan lebar teks yang tergambar.
 */
function fitText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  { weight = 'bold', size = 28, minSize = 14, family = FONT.display } = {},
) {
  let current = size;
  const setFont = s => {
    ctx.font = `${weight} ${s}px ${family}`.trim();
  };
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

/**
 * Gambar logo rank setelah teks info rank. Dipakai bersama kartu rank dan
 * profile supaya ukuran/posisinya konsisten; rasio asli gambar diikuti, hanya
 * sisi terpanjang yang dipatok `maxSize` (logo tier berukuran kotak).
 */
async function drawRankLogo(ctx, logoPath, x, baselineY, maxSize = 26) {
  if (!logoPath || !fs.existsSync(logoPath)) return;
  try {
    const logo = await loadImage(logoPath);
    const ratio = Math.min(maxSize / logo.width, maxSize / logo.height);
    const w = logo.width * ratio;
    const h = logo.height * ratio;
    ctx.drawImage(logo, x, baselineY - h / 2 - 7, w, h);
  } catch (error) {
    logger.error('Gagal load rank logo:', error.message);
  }
}

module.exports = { roundRect, drawCover, hexToRgb, fetchAvatarBuffer, loadAvatar, fitText, drawRankLogo, FONT };
