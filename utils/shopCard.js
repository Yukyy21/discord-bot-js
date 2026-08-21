const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { roundRect } = require('./canvas');
const { getItemImagePath } = require('./itemImages');
const { TIER_CONFIG } = require('./shopRotation');

const CARD_W = 345;
const CARD_H = 150;
const GAP = 15;
const PADDING = 20;
const COLS = 2;
const IMG_SIZE = 118;

async function loadItemImages(ids) {
  const map = new Map();
  await Promise.all([...ids].map(async (id) => {
    const filePath = getItemImagePath(id);
    if (!filePath) return;
    try {
      map.set(id, await loadImage(filePath));
    } catch (e) {
      console.error(`Gagal load gambar item ${id}:`, e.message);
    }
  }));
  return map;
}

function drawPlaceholder(ctx, x, y) {
  ctx.fillStyle = '#111214';
  ctx.fillRect(x, y, IMG_SIZE, IMG_SIZE);
  ctx.fillStyle = '#4e5058';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x + IMG_SIZE / 2, y + IMG_SIZE / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

async function buildItemGridCard(entries) {
  const rows = Math.ceil(entries.length / COLS);
  const width = PADDING * 2 + COLS * CARD_W + (COLS - 1) * GAP;
  const height = PADDING * 2 + rows * CARD_H + (rows - 1) * GAP;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  roundRect(ctx, 0, 0, width, height, 20);
  ctx.fillStyle = '#1e1f22';
  ctx.fill();

  const images = await loadItemImages(entries.map(e => e.id));

  for (let idx = 0; idx < entries.length; idx++) {
    const entry = entries[idx];
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const x = PADDING + col * (CARD_W + GAP);
    const y = PADDING + row * (CARD_H + GAP);

    roundRect(ctx, x, y, CARD_W, CARD_H, 14);
    ctx.fillStyle = '#2b2d31';
    ctx.fill();

    roundRect(ctx, x, y, 6, CARD_H, 3);
    ctx.fillStyle = entry.accentColor || '#95a5a6';
    ctx.fill();

    const imgX = x + 18;
    const imgY = y + (CARD_H - IMG_SIZE) / 2;
    roundRect(ctx, imgX, imgY, IMG_SIZE, IMG_SIZE, 10);
    ctx.save();
    ctx.clip();
    const img = images.get(entry.id);
    if (img) {
      const ratio = Math.max(IMG_SIZE / img.width, IMG_SIZE / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      ctx.drawImage(img, imgX + (IMG_SIZE - w) / 2, imgY + (IMG_SIZE - h) / 2, w, h);
    } else {
      drawPlaceholder(ctx, imgX, imgY);
    }
    ctx.restore();

    const tx = imgX + IMG_SIZE + 16;
    const maxTextW = x + CARD_W - tx - 12;

    ctx.fillStyle = '#949ba4';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`ID ${entry.id}`, tx, y + 32);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(truncateText(ctx, entry.title, maxTextW), tx, y + 58);

    if (entry.subtitle) {
      ctx.fillStyle = entry.subtitleColor || '#949ba4';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(truncateText(ctx, entry.subtitle, maxTextW), tx, y + 84);
    }

    if (entry.value) {
      ctx.fillStyle = entry.valueColor || '#ffd700';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText(truncateText(ctx, entry.value, maxTextW), tx, y + 114);
    }
  }

  return canvas.toBuffer('image/png');
}

async function buildShopCard(items) {
  const entries = items.map(i => ({
    id: i.id,
    title: i.name,
    accentColor: (TIER_CONFIG[i.tier] || {}).color,
    subtitle: (i.tier || '').toUpperCase(),
    subtitleColor: (TIER_CONFIG[i.tier] || {}).color,
    value: `${Number(i.price).toLocaleString('en-US')} coins`,
  }));
  return buildItemGridCard(entries);
}

async function buildInventoryCard(items) {
  const entries = items.map(i => ({
    id: i.itemId,
    title: i.name,
    subtitle: `Jumlah: x${i.quantity}`,
    value: null,
  }));
  return buildItemGridCard(entries);
}

module.exports = { buildShopCard, buildInventoryCard };
