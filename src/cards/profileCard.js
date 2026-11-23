const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('node:fs');
const { roundRect, drawCover, loadAvatar, fitText, drawRankLogo, FONT } = require('./canvasKit');
const { asset } = require('../lib/paths');
const { allowedBackground, decodeBackgroundImage } = require('../lib/profileBackground');

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
  background,
}) {
  const width = 1000;
  const height = 560;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const amber = '#ffbe55';
  const muted = '#c7cbd2';
  const number = value => (Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0);
  const format = value => number(value).toLocaleString('id-ID');
  const progress = xpNeeded > 0 ? Math.max(0, Math.min(number(xp) / xpNeeded, 1)) : 0;

  roundRect(ctx, 0, 0, width, height, 28);
  ctx.clip();
  ctx.fillStyle = '#151a22';
  ctx.fillRect(0, 0, width, height);

  const bgPath = asset('profile', 'Profile.jpeg');
  let appliedCustomBg = false;

  const customBackground = allowedBackground(background, level);
  if (customBackground?.kind === 'image') {
    const image = await decodeBackgroundImage(customBackground.buffer);
    if (image) {
      drawCover(ctx, image, 0, 0, width, height);
      appliedCustomBg = true;
    }
  } else if (customBackground) {
    ctx.fillStyle = customBackground.color;
    ctx.fillRect(0, 0, width, height);
    appliedCustomBg = true;
  }

  if (!appliedCustomBg && fs.existsSync(bgPath)) {
    try {
      const bg = await loadImage(bgPath);
      drawCover(ctx, bg, 0, 0, width, height);
    } catch {
      ctx.fillStyle = '#151a22';
      ctx.fillRect(0, 0, width, height);
    }
  }

  ctx.fillStyle = 'rgba(10, 14, 20, 0.66)';
  ctx.fillRect(0, 0, width, height);
  const shade = ctx.createLinearGradient(0, 0, width, 0);
  shade.addColorStop(0, 'rgba(10, 14, 20, 0.82)');
  shade.addColorStop(0.65, 'rgba(10, 14, 20, 0.12)');
  shade.addColorStop(1, 'rgba(10, 14, 20, 0.32)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 190, 85, 0.55)';
  ctx.lineWidth = 2;
  roundRect(ctx, 1, 1, width - 2, height - 2, 28);
  ctx.stroke();

  ctx.fillStyle = muted;
  ctx.font = `bold 15px ${FONT.body}`;
  ctx.fillText('PROFIL KOMUNITAS', 42, 48);
  ctx.textAlign = 'right';
  ctx.fillText('PERINGKAT SERVER', 958, 48);
  ctx.fillStyle = amber;
  fitText(ctx, rank ? `#${format(rank)}` : 'Belum ada', 958, 83, 180, { size: 28, minSize: 18 });
  ctx.textAlign = 'left';

  const img = await loadAvatar(avatar, username, 180);
  ctx.save();
  ctx.beginPath();
  ctx.arc(116, 174, 68, 0, Math.PI * 2);
  ctx.clip();
  drawCover(ctx, img, 48, 106, 136, 136);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(116, 174, 73, 0, Math.PI * 2);
  ctx.strokeStyle = amber;
  ctx.lineWidth = 3;
  ctx.stroke();

  roundRect(ctx, 140, 216, 60, 34, 9);
  ctx.fillStyle = '#191e27';
  ctx.fill();
  ctx.strokeStyle = amber;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  fitText(ctx, format(level), 170, 240, 48, { size: 20, minSize: 12 });
  ctx.textAlign = 'left';

  ctx.fillStyle = amber;
  fitText(ctx, username || 'Pengguna', 220, 158, 545, { size: 44, minSize: 25 });
  ctx.fillStyle = muted;
  ctx.font = `16px ${FONT.body}`;
  ctx.fillText(`LEVEL ${format(level)}`, 222, 190);
  ctx.fillStyle = '#ffffff';
  fitText(ctx, rankName || 'Novice', 222, 225, 480, { size: 25, minSize: 16 });

  roundRect(ctx, 826, 105, 132, 143, 16);
  ctx.fillStyle = 'rgba(13, 18, 26, 0.88)';
  ctx.fill();
  if (rankLogo && fs.existsSync(rankLogo)) {
    await drawRankLogo(ctx, rankLogo, 854, 192, 76);
  } else {
    ctx.fillStyle = amber;
    ctx.textAlign = 'center';
    fitText(ctx, `LV ${format(level)}`, 892, 181, 108, { size: 26, minSize: 14 });
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = muted;
  ctx.textAlign = 'center';
  fitText(ctx, rankName || 'Novice', 892, 229, 112, { size: 15, minSize: 11, family: FONT.body });
  ctx.textAlign = 'left';

  ctx.fillStyle = muted;
  ctx.font = `bold 14px ${FONT.body}`;
  ctx.fillText('PROGRES LEVEL', 42, 292);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.font = `bold 22px ${FONT.display}`;
  ctx.fillText(`${Math.round(progress * 100)}%`, 958, 292);
  ctx.textAlign = 'left';
  roundRect(ctx, 42, 308, 916, 12, 6);
  ctx.fillStyle = '#353b45';
  ctx.fill();
  if (progress > 0) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = amber;
    ctx.fillRect(42, 308, 916 * progress, 12);
    ctx.restore();
  }
  ctx.fillStyle = muted;
  ctx.font = `14px ${FONT.body}`;
  fitText(ctx, xpNeeded > 0 ? `${format(xp)} / ${format(xpNeeded)} XP` : `${format(xp)} XP`, 42, 347, 600, {
    size: 14,
    minSize: 12,
    family: FONT.body,
    weight: 'normal',
  });
  ctx.textAlign = 'right';
  ctx.fillText(`LEVEL ${format(number(level) + 1)} BERIKUTNYA`, 958, 347);
  ctx.textAlign = 'left';

  const stats = [
    { label: 'DOMPET', value: format(balance), unit: 'COIN' },
    { label: 'BANK', value: format(bank), unit: 'COIN' },
    { label: 'STREAK', value: format(streak), unit: 'HARI' },
    { label: 'POIN', value: format(points), unit: 'TOTAL POIN' },
  ];
  roundRect(ctx, 42, 382, 916, 118, 14);
  ctx.fillStyle = 'rgba(13, 18, 26, 0.94)';
  ctx.fill();
  ctx.strokeStyle = '#414752';
  ctx.lineWidth = 1;
  ctx.stroke();
  stats.forEach((stat, index) => {
    const x = 42 + index * 229;
    if (index > 0) {
      ctx.beginPath();
      ctx.moveTo(x, 404);
      ctx.lineTo(x, 479);
      ctx.stroke();
    }
    ctx.fillStyle = muted;
    ctx.font = `bold 13px ${FONT.body}`;
    ctx.fillText(stat.label, x + 20, 410);
    ctx.fillStyle = '#ffffff';
    fitText(ctx, stat.value, x + 20, 449, 189, { size: 30, minSize: 16 });
    ctx.fillStyle = muted;
    ctx.font = `11px ${FONT.body}`;
    ctx.fillText(stat.unit, x + 20, 478);
  });

  ctx.fillStyle = muted;
  ctx.font = `11px ${FONT.body}`;
  ctx.fillText('KARTU PROFIL / EKONOMI & AKTIVITAS', 42, 533);
  ctx.textAlign = 'right';
  ctx.fillText('/profile', 958, 533);

  return canvas.toBuffer('image/png');
}

module.exports = { buildProfileCard };
