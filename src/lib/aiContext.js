// Pembaca file konteks AI (default: Docs/ai.md).
//
// Dipisah dari lib/ai.js supaya jelas: file ini HANYA soal ambil teks
// pengetahuan dari disk + cache, tanpa tahu apa-apa soal provider AI.
const fs = require('node:fs');
const path = require('node:path');
const { ROOT } = require('./paths');
const { AI } = require('../config/ai');

let cache = { text: '', loadedAt: 0, files: [] };

/** Baca semua CONTEXT_FILES jadi satu teks. File yang hilang dilewati. */
function readContextFiles() {
  const parts = [];
  const found = [];
  for (const rel of AI.CONTEXT_FILES) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) {
      console.warn(`[AI] File konteks tidak ditemukan: ${rel}`);
      continue;
    }
    parts.push(`--- FILE: ${rel} ---\n${fs.readFileSync(full, 'utf8')}`);
    found.push(rel);
  }
  let text = parts.join('\n\n');
  if (text.length > AI.MAX_CONTEXT_CHARS) {
    text = `${text.slice(0, AI.MAX_CONTEXT_CHARS)}\n\n[konteks dipotong karena terlalu panjang]`;
  }
  return { text, files: found };
}

/**
 * Konteks siap pakai. Di-cache selama CONTEXT_CACHE_MS supaya tidak
 * baca disk tiap pertanyaan, tapi tetap ikut kalau ai.md diedit.
 */
function getContext() {
  const fresh = AI.CONTEXT_CACHE_MS > 0 && Date.now() - cache.loadedAt < AI.CONTEXT_CACHE_MS;
  if (fresh && cache.text) return cache;

  const { text, files } = readContextFiles();
  cache = { text, files, loadedAt: Date.now() };
  return cache;
}

/** Paksa baca ulang dari disk (dipakai kalau ai.md diubah saat bot hidup). */
function reloadContext() {
  cache = { text: '', loadedAt: 0, files: [] };
  return getContext();
}

module.exports = { getContext, reloadContext };

