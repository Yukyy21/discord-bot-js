const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('node:fs');
const { roundRect, loadAvatar, fitText, drawRankLogo } = require('./canvasKit');
const { asset } = require('../lib/paths');

async function buildProfileCard({
  avatar,
  username,
  level,
  rank,
  xp,
  xpNeeded,
  balance,
  bank,
  streak,
  points,
  rankName,
  rankLogo,
}) {
  const canvas = createCanvas(600, 340);
  const ctx = canvas.getContext('2d');

  const bgPath = asset('profile', 'Profile.jpeg');
  if (fs.existsSync(bgPath)) {
    try {
      const bg = await loadImage(bgPath);
      ctx.drawImage(bg, 0, 0, 600, 340);
    } catch (e) {
      roundRect(ctx, 0, 0, 600, 340, 20);
      ctx.fillStyle = '#2b2d31';
      ctx.fill();
    }
  } else {
    roundRect(ctx, 0, 0, 600, 340, 20);
    ctx.fillStyle = '#2b2d31';
    ctx.fill();
  }

  roundRect(ctx, 0, 0, 600, 340, 20);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();

  const img = await loadAvatar(avatar, username, 128);
  ctx.save();
  ctx.beginPath();
  ctx.arc(70, 100, 50, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, 20, 50, 100, 100);
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  fitText(ctx, username, 150, 80, 410, { size: 28, minSize: 16 });

  ctx.fillStyle = '#b5bac1';
  ctx.font = '18px sans-serif';
  const rankText = `${rankName || 'Novice'}  •  Level ${level}  •  Rank #${rank}`;
  ctx.fillText(rankText, 150, 110);

  await drawRankLogo(ctx, rankLogo, 150 + ctx.measureText(rankText).width + 8, 110);

  const barW = 400;
  const barH = 22;
  const x0 = 150;
  const y0 = 130;
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
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(xpNeeded > 0 ? `${xp}/${xpNeeded} XP` : `${xp} XP`, x0 + barW / 2, y0 + barH - 6);
  ctx.textAlign = 'left';

  const statsY = 195;
  const colW = 200;
  const stats = [
    { color: '#f1c40f', label: 'DOMPET', value: `${balance.toLocaleString()} coin` },
    { color: '#2ecc71', label: 'BANK', value: `${bank.toLocaleString()} coin` },
    { color: '#e74c3c', label: 'STREAK', value: `${streak} hari` },
    { color: '#ffffff', label: 'POIN', value: points.toLocaleString() },
  ];

  stats.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = x0 + col * colW;
    const sy = statsY + row * 60;

    ctx.beginPath();
    ctx.arc(sx + 6, sy + 8, 5, 0, Math.PI * 2);
    ctx.fillStyle = s.color;
    ctx.fill();

    ctx.fillStyle = '#b5bac1';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(s.label, sx + 18, sy + 12);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(s.value, sx, sy + 36);
  });

  return canvas.toBuffer('image/png');
}

module.exports = { buildProfileCard };
