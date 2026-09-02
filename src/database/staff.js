const { db } = require('./connection');
const { localDateKey } = require('../lib/boss');

/** Kunci bulan berjalan (YYYY-MM) dalam zona waktu lokal event server. */
function currentYearMonth(date = new Date()) {
  return localDateKey(date).slice(0, 7);
}

/** Cek apakah user terdaftar sebagai staff di guild ini. */
function isStaff(userId, guildId) {
  return !!db.prepare('SELECT 1 FROM staff WHERE userId = ? AND guildId = ?').get(userId, guildId);
}

/** Tambah staff. Gagal ('exists') kalau user itu sudah terdaftar di guild ini. */
function addStaff(userId, guildId, divisi, deskripsi, addedBy) {
  if (isStaff(userId, guildId)) return { ok: false, message: 'User itu sudah terdaftar sebagai staff di server ini.' };
  const addedAt = Date.now();
  db.prepare(
    'INSERT INTO staff (userId, guildId, divisi, deskripsi, addedAt, addedBy) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(userId, guildId, divisi, deskripsi || null, addedAt, addedBy);
  return { ok: true, row: getStaff(userId, guildId) };
}

/** Hapus staff. Gagal ('missing') kalau user itu belum terdaftar. */
function removeStaff(userId, guildId) {
  const result = db.prepare('DELETE FROM staff WHERE userId = ? AND guildId = ?').run(userId, guildId);
  if (result.changes === 0) return { ok: false, message: 'User itu bukan staff di server ini.' };
  return { ok: true };
}

/** Ambil satu staff + rata-ratanya. Null kalau bukan staff. */
function getStaff(userId, guildId) {
  const row = db.prepare('SELECT * FROM staff WHERE userId = ? AND guildId = ?').get(userId, guildId);
  if (!row) return null;
  return withRating(row);
}

/** Semua staff di guild, urut menurut divisi lalu addedAt. */
function listStaff(guildId) {
  const rows = db
    .prepare('SELECT * FROM staff WHERE guildId = ? ORDER BY divisi COLLATE NOCASE, addedAt ASC')
    .all(guildId);
  const withName = rows.map(withRating);

  // Kelompokkan per divisi (urutan sesuai kemunculan pertama di daftar).
  const groups = [];
  const index = new Map();
  for (const row of withName) {
    const key = row.divisi.toLowerCase();
    if (!index.has(key)) {
      index.set(key, groups.length);
      groups.push({ divisi: row.divisi, members: [] });
    }
    groups[index.get(key)].members.push(row);
  }
  return groups;
}

/** Lengkapi satu baris staff dengan rata-rata bintang rating di guild itu. */
function withRating(staffRow) {
  const avg = db
    .prepare('SELECT AVG(stars) AS avg, COUNT(*) AS count FROM staff_ratings WHERE staffUserId = ? AND guildId = ?')
    .get(staffRow.userId, staffRow.guildId);
  return { ...staffRow, ratingAvg: avg.avg ? Math.round(avg.avg * 10) / 10 : null, ratingCount: avg.count || 0 };
}

/**
 * Beri/ubah rating. Satu user hanya 1 rating per staff di guild yang sama —
 * rating ulang sama seperti `INSERT OR REPLACE` (renilai, bukan nambah baris).
 */
function setRating(staffUserId, raterUserId, guildId, stars, comment) {
  if (raterUserId === staffUserId) return { ok: false, message: 'Kamu tidak bisa menilai dirimu sendiri.' };
  if (!isStaff(staffUserId, guildId)) return { ok: false, message: 'User itu bukan staff di server ini.' };
  const now = Date.now();
  db.prepare(
    `INSERT INTO staff_ratings (staffUserId, raterUserId, guildId, stars, comment, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (staffUserId, raterUserId, guildId) DO UPDATE SET
       stars = excluded.stars,
       comment = excluded.comment,
       updatedAt = excluded.updatedAt`,
  ).run(staffUserId, raterUserId, guildId, stars, comment || null, now, now);
  return { ok: true };
}

/**
 * Ambil baris aktivitas bulan berjalan (atau bulan tertentu), buat baris baru
 * kalau belum ada. Dipakai penghitung untuk increment.
 */
function getActivity(userId, guildId, yearMonth = currentYearMonth()) {
  let row = db
    .prepare('SELECT * FROM staff_activity WHERE userId = ? AND guildId = ? AND yearMonth = ?')
    .get(userId, guildId, yearMonth);
  if (!row) {
    db.prepare(
      'INSERT INTO staff_activity (userId, guildId, yearMonth) VALUES (?, ?, ?)',
    ).run(userId, guildId, yearMonth);
    row = db
      .prepare('SELECT * FROM staff_activity WHERE userId = ? AND guildId = ? AND yearMonth = ?')
      .get(userId, guildId, yearMonth);
  }
  return row;
}

/** Increment satu metrik aktivitas staff pada baris bulan berjalan. */
function bumpActivity(userId, guildId, field, amount = 1) {
  const month = currentYearMonth();
  const row = getActivity(userId, guildId, month);
  if (row[field] === undefined) return;
  db.prepare(
    `UPDATE staff_activity SET ${field} = ${field} + ? WHERE userId = ? AND guildId = ? AND yearMonth = ?`,
  ).run(amount, userId, guildId, month);
}

/**
 * Akumulasi menit voice untuk staff. Dipanggil dari jalur voice dengan jumlah
 * menit yang sudah layak (syarat "minimal 2 orang tidak deaf" di evaluasi
 * pemanggil), jadi di sini tinggal menambah.
 */
function addVoiceMinutes(userId, guildId, minutes) {
  if (minutes <= 0) return;
  bumpActivity(userId, guildId, 'voiceMinutes', minutes);
}

/**
 * Leaderboard bulanan 4 metrik, dinormalisasi ke rentang 0-1 tiap metrik
 * (nilai staff dibagi nilai tertinggi metrik itu), lalu dirata-rata sama rata.
 * Ini menghindari satuannya yang beda (pesan vs menit vs tag) berbenturan.
 * Mengembalikan array terurut [staff info + skor + tiap metrik], kosong kalau
 * bulan itu belum ada staff yang beraktivitas.
 */
function bestStaff(guildId, yearMonth = currentYearMonth()) {
  const rows = db
    .prepare(
      `SELECT sa.*, st.divisi, st.deskripsi
       FROM staff_activity sa
       JOIN staff st ON st.userId = sa.userId AND st.guildId = sa.guildId
       WHERE sa.guildId = ? AND sa.yearMonth = ?`,
    )
    .all(guildId, yearMonth);
  if (rows.length === 0) return [];

  const METRICS = ['messageCount', 'voiceMinutes', 'tagCount', 'announcementCount'];
  const top = {};
  for (const m of METRICS) {
    top[m] = Math.max(...rows.map(r => r[m] || 0), 1);
  }

  return rows
    .map(r => {
      const norm = {};
      for (const m of METRICS) norm[m] = r[m] || 0;
      const score = METRICS.reduce((sum, m) => sum + norm[m] / top[m], 0) / METRICS.length;
      return {
        userId: r.userId,
        divisi: r.divisi,
        deskripsi: r.deskripsi,
        messageCount: r.messageCount || 0,
        voiceMinutes: r.voiceMinutes || 0,
        tagCount: r.tagCount || 0,
        announcementCount: r.announcementCount || 0,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  currentYearMonth,
  isStaff,
  addStaff,
  removeStaff,
  getStaff,
  listStaff,
  setRating,
  getActivity,
  bumpActivity,
  addVoiceMinutes,
  bestStaff,
};