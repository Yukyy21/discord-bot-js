const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('node:fs');
const { roundRect, loadAvatar, fitText, drawRankLogo } = require('./canvasKit');
const { asset } = require('../lib/paths');

async function buildRankCard({ avatar, username, level, rank, xp, xpNeeded, rankName, rankLogo }) {
  const canvas = createCanvas(600, 200);
  const ctx = canvas.getContext('2d');

  const bgPath = asset('rank', 'Rank.jpeg');
  if (fs.existsSync(bgPath)) {
    try {
      const bg = await loadImage(bgPath);
      ctx.drawImage(bg, 0, 0, 600, 200);
    } catch (e) {
      roundRect(ctx, 0, 0, 600, 200, 20);
      ctx.fillStyle = '#2b2d31';
      ctx.fill();
    }
  } else {
    roundRect(ctx, 0, 0, 600, 200, 20);
    ctx.fillStyle = '#2b2d31';
    ctx.fill();
  }

  roundRect(ctx, 0, 0, 600, 200, 20);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();

  const img = await loadAvatar(avatar, username, 128);
  ctx.save();
  ctx.beginPath();
  ctx.arc(70, 80, 50, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, 20, 30, 100, 100);
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  fitText(ctx, username, 150, 65, 410, { size: 26, minSize: 15 });

  ctx.fillStyle = '#b5bac1';
  ctx.font = '16px sans-serif';
  const rankText = `${rankName || 'Novice'}  •  Level ${level}  •  #${rank}`;
  ctx.fillText(rankText, 150, 95);

  await drawRankLogo(ctx, rankLogo, 150 + ctx.measureText(rankText).width + 8, 95);

  const barW = 400;
  const barH = 20;
  const x0 = 150;
  const y0 = 115;
  // Level 0 butuh 0 XP (xpForLevel(0) = 0) → bagi nol jadi NaN. Bar kosong dan
  // label tanpa rasio kalau xpNeeded belum terdefinisi.
  const pct = xpNeeded > 0 ? Math.min(xp / xpNeeded, 1) : 0;

  roundRect(ctx, x0, y0, barW, barH, barH / 2);
  ctx.fillStyle = '#404249';
  ctx.fill();
  if (pct > 0) {
    roundRect(ctx, x0, y0, Math.max(barW * pct, barH), barH, barH / 2);
    ctx.fillStyle = '#5865f2';
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(xpNeeded > 0 ? `${xp}/${xpNeeded} XP` : `${xp} XP`, x0 + barW / 2, y0 + barH - 5);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

module.exports = { buildRankCard };
