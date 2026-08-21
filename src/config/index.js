module.exports = {
  LEVEL_ROLES: {
    // level: 'roleId' — isi ID role yang mau di-assign saat user naik ke level tsb.
    // Contoh: 3: '120000000000000000', 5: '120000000000000001'
  },

  // ID emoji sudah terpasang di utils/emojis.js (REGISTRY).
  // Bagian ini HANYA untuk override / emoji tambahan tanpa mengedit registry.
  // Format: key_emoji: 'ID_ANGKA'. Lihat customemoji.md.
  EMOJI_IDS: {
    // bar_fill: '1300000000000000001',
    // bar_empty: '1300000000000000002',
  },

  // Override status animated (GIF) per key. Default sudah diisi di registry.
  EMOJI_ANIMATED: {
    // bar_fill: false,
  },
};
