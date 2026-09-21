const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('node:fs');
const { roundRect, drawCover, loadAvatar, fitText, FONT } = require('./canvasKit');
const { asset } = require('../lib/paths');

const W = 750;
const H = 560;

const COLOR = {
  white: '#ffffff',
  muted: '#b5bac1',
  panel: 'rgba(18,18,22,0.55)',
  panelBorder: 'rgba(255,255,255,0.08)',
  divider: 'rgba(255,255,255,0.12)',
  accent: '#5865f2',
  gold: '#f1c40f',
  starEmpty: 'rgba(255,255,255,0.35)',
};

/** Path 5 sudut bintang (dipakai isi solid atau garis outline). */
function starPath(ctx, cx, cy, outerR) {
  const innerR = outerR * 0.42;
  const rot = -Math.PI / 2;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const oa = rot + (i * 2 * Math.PI) / 5;
    const ia = oa + Math.PI / 5;
    ctx.lineTo(cx + outerR * Math.cos(oa), cy + outerR * Math.sin(oa));
    ctx.lineTo(cx + innerR * Math.cos(ia), cy + innerR * Math.sin(ia));
  }
  ctx.closePath();
}

function drawStar(ctx, cx, cy, outerR, filled) {
  starPath(ctx, cx, cy, outerR);
  if (filled) {
    ctx.fillStyle = COLOR.gold;
    ctx.fill();
  } else {
    ctx.strokeStyle = COLOR.starEmpty;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/** Potong ke `max` karakter (bukan pixel) — dipakai buat komentar rating biar konsisten pendek. */
function truncate(text, max = 40) {
  const t = String(text ?? '').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/**
 * Word-wrap manual dibatasi lebar pixel & jumlah baris; baris terakhir diberi
 * elipsis kalau masih ada sisa kata yang tidak muat. Kata tunggal yang lebih
 * lebar dari `maxWidth` sendiri dipotong paksa biar tidak keluar kanvas.
 */
function wrapText(ctx, text, maxWidth, maxLines) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  let i = 0;
  while (i < words.length) {
    let word = words[i];
    if (ctx.measureText(word).width > maxWidth) {
      while (word.length > 1 && ctx.measureText(word).width > maxWidth) word = word.slice(0, -1);
    }
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      // Baris berjalan sudah penuh. Kalau ini bakal jadi baris terakhir yang
      // diizinkan, stop DI SINI tanpa mengonsumsi `word` — biar `i` tetap
      // menunjuk ke kata yang belum masuk, supaya pengecekan overflow di
      // bawah tahu masih ada sisa dan baris terakhir diberi elipsis (bukan
      // kata itu hilang diam-diam tanpa tanda apa pun).
      if (lines.length + 1 === maxLines) {
        lines.push(line);
        line = '';
        break;
      }
      lines.push(line);
      line = word;
      i++;
    } else {
      line = test;
      i++;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (i < words.length && lines.length) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

function pill(ctx, text, cx, cy, maxWidth) {
  const label = text.toUpperCase();
  let size = 14;
  ctx.font = `bold ${size}px ${FONT.display}`;
  const padX = 16;
  // Kalau divisi-nya kepanjangan, kecilin font pelan-pelan dulu sebelum
  // kepepet dipotong — biar badge tetap muat dalam panel (maxWidth).
  while (size > 10 && ctx.measureText(label).width + padX * 2 > maxWidth) {
    size -= 1;
    ctx.font = `bold ${size}px ${FONT.display}`;
  }
  const w = Math.min(ctx.measureText(label).width + padX * 2, maxWidth);
  const h = 30;
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fillStyle = COLOR.accent;
  ctx.fill();
  ctx.fillStyle = COLOR.white;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + 1, w - padX);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/** Shadow tipis di belakang teks penting (nama, angka rating) biar kebaca
 * jelas di atas background yang ramai & sedikit lebih "premium", bukan flat.
 * Selalu dimatikan lagi setelah dipakai supaya tidak bocor ke elemen lain. */
function withShadow(ctx, fn) {
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  fn();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Kartu satu staff: avatar, divisi (pill), rating rata-rata (bintang), lalu
 * di kolom kanan deskripsi + 5 rating terbaru. Dipakai `/staff` (satu staff
 * per halaman, lewat tombol prev/next — lihat commands/staff/staff.js).
 *
 * @param {object} p
 * @param {string|null} p.avatar - URL avatar (null = pakai fallback inisial)
 * @param {string} p.username
 * @param {string} p.divisi
 * @param {string|null} p.deskripsi
 * @param {number|null} p.ratingAvg - null kalau belum ada rating sama sekali
 * @param {number} p.ratingCount
 * @param {number} p.addedAt - epoch ms, buat "Staff sejak <bulan tahun>"
 * @param {{stars:number, comment:string|null, raterName:string}[]} p.recentRatings - maks 5, terbaru dulu
 * @param {number} p.page - 0-based
 * @param {number} p.totalPages
 */
async function buildStaffCard({
  avatar,
  username,
  divisi,
  deskripsi,
  ratingAvg,
  ratingCount,
  addedAt,
  recentRatings = [],
  page,
  totalPages,
}) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background: StaffCard.jpg cover-fit (crop tengah, TANPA stretch) + overlay
  // gelap biar teks kebaca.
  const bgPath = asset('staff', 'StaffCard.jpg');
  if (fs.existsSync(bgPath)) {
    try {
      const bg = await loadImage(bgPath);
      drawCover(ctx, bg, 0, 0, W, H);
    } catch {
      ctx.fillStyle = '#1a1a1e';
      ctx.fillRect(0, 0, W, H);
    }
  } else {
    ctx.fillStyle = '#1a1a1e';
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);

  // ── Panel kiri: identitas ────────────────────────────────────────────
  const L = { x: 28, y: 56, w: 228, h: 430 };
  roundRect(ctx, L.x, L.y, L.w, L.h, 18);
  ctx.fillStyle = COLOR.panel;
  ctx.fill();
  roundRect(ctx, L.x, L.y, L.w, L.h, 18);
  ctx.strokeStyle = COLOR.panelBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  const cx = L.x + L.w / 2;

  const avatarImg = await loadAvatar(avatar, username, 128);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, 136, 58, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatarImg, cx - 58, 78, 116, 116);
  ctx.restore();

  pill(ctx, divisi || 'Staff', cx, 214, L.w - 24);

  ctx.fillStyle = COLOR.white;
  ctx.textAlign = 'center';
  withShadow(ctx, () => fitText(ctx, username, cx, 262, L.w - 24, { size: 28, minSize: 17 }));
  ctx.textAlign = 'left';

  ctx.strokeStyle = COLOR.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(L.x + 18, 282);
  ctx.lineTo(L.x + L.w - 18, 282);
  ctx.stroke();

  const filled = ratingAvg ? Math.round(ratingAvg) : 0;
  const starGap = 34;
  const starStartX = cx - starGap * 2;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, starStartX + i * starGap, 328, 16, i < filled);
  }

  ctx.fillStyle = COLOR.muted;
  ctx.font = `bold 16px ${FONT.body}`;
  ctx.textAlign = 'center';
  ctx.fillText(
    ratingAvg ? `${ratingAvg} · ${ratingCount} rating` : 'Belum ada rating',
    cx,
    362,
  );
  ctx.textAlign = 'left';

  // ── Panel kanan: deskripsi + rating terbaru ─────────────────────────
  const R = { x: 272, y: 56, w: 450, h: 430 };
  roundRect(ctx, R.x, R.y, R.w, R.h, 18);
  ctx.fillStyle = COLOR.panel;
  ctx.fill();
  roundRect(ctx, R.x, R.y, R.w, R.h, 18);
  ctx.strokeStyle = COLOR.panelBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  const rTextX = R.x + 24;
  const rTextW = R.w - 48;

  ctx.fillStyle = COLOR.muted;
  ctx.font = `bold 14px ${FONT.body}`;
  ctx.fillText('DESKRIPSI', rTextX, 92);

  ctx.font = deskripsi ? `18px ${FONT.body}` : `italic 18px ${FONT.body}`;
  ctx.fillStyle = deskripsi ? COLOR.white : COLOR.muted;
  const descLines = wrapText(ctx, deskripsi || 'Belum ada deskripsi.', rTextW, 3);
  descLines.forEach((line, i) => ctx.fillText(line, rTextX, 122 + i * 26));

  ctx.strokeStyle = COLOR.divider;
  ctx.beginPath();
  ctx.moveTo(rTextX, 204);
  ctx.lineTo(R.x + R.w - 24, 204);
  ctx.stroke();

  ctx.fillStyle = COLOR.muted;
  ctx.font = `bold 14px ${FONT.body}`;
  ctx.fillText('RATING TERBARU', rTextX, 228);

  if (recentRatings.length === 0) {
    ctx.font = `italic 16px ${FONT.body}`;
    ctx.fillStyle = COLOR.muted;
    ctx.fillText('Belum ada rating.', rTextX, 258);
  } else {
    recentRatings.slice(0, 5).forEach((r, i) => {
      const y = 258 + i * 38;
      drawStar(ctx, rTextX + 9, y - 6, 9, true);

      ctx.font = `bold 17px ${FONT.display}`;
      ctx.fillStyle = COLOR.white;
      const starLabel = `${r.stars}`;
      ctx.fillText(starLabel, rTextX + 26, y);
      const starLabelW = ctx.measureText(starLabel).width;

      const rest = r.comment ? `${r.raterName} — "${truncate(r.comment, 40)}"` : r.raterName;
      ctx.font = `16px ${FONT.body}`;
      ctx.fillStyle = COLOR.muted;
      fitText(ctx, rest, rTextX + 26 + starLabelW + 12, y, rTextW - 26 - starLabelW - 12, {
        weight: 'normal',
        size: 16,
        minSize: 12,
      });
    });
  }

  // ── Footer ───────────────────────────────────────────────────────────
  ctx.strokeStyle = COLOR.divider;
  ctx.beginPath();
  ctx.moveTo(28, 500);
  ctx.lineTo(W - 28, 500);
  ctx.stroke();

  ctx.fillStyle = COLOR.muted;
  ctx.font = `15px ${FONT.body}`;
  const sinceLabel = addedAt
    ? new Date(addedAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    : '—';
  ctx.textAlign = 'left';
  ctx.fillText(`Staff sejak ${sinceLabel}`, 28, 530);

  ctx.textAlign = 'center';
  ctx.fillText('Nilai lewat /staff-rating', W / 2, 530);

  ctx.textAlign = 'right';
  ctx.fillText(`Staff ${page + 1} dari ${totalPages}`, W - 28, 530);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

module.exports = { buildStaffCard };
