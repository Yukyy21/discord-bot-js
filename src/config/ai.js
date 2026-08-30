// ============================================================
// KONFIGURASI FITUR AI (/ai-ask)
// ------------------------------------------------------------
// Semua "rasa" AI diatur di sini: kepribadian, gaya bahasa, model,
// panjang jawaban, cooldown, dan file konteks yang dibaca.
// Kunci API TIDAK ditaruh di file ini — semuanya di .env,
// supaya aman kalau repo dibagikan.
//
// PROVIDER: dipakai berurutan (fallback chain).
//   1. Groq            (utama, paling cepat)
//   2. Google AI Studio (kunci #1)
//   3. Google AI Studio (kunci #2)
// Kalau provider kena limit / error, otomatis lanjut ke bawahnya.
// Provider tanpa kunci di .env otomatis dilewati.
// ============================================================

const AI = {
  /** Matikan tanpa hapus command: /ai-ask akan menjawab "fitur dimatikan". */
  ENABLED: true,

  // — Rantai provider (urutan = prioritas) —
  // Semua provider di bawah memakai format API OpenAI-compatible,
  // jadi kodenya satu jalur saja.
  PROVIDERS: [
    {
      key: 'groq',
      label: 'Groq',
      apiKeyEnv: 'GROQ_API_KEY',
      baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    },
    {
      key: 'google-1',
      label: 'Google AI Studio (kunci 1)',
      apiKeyEnv: 'GOOGLE_AI_API_KEY',
      baseUrl: process.env.GOOGLE_AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: process.env.GOOGLE_AI_MODEL || 'gemini-2.0-flash',
    },
    {
      key: 'google-2',
      label: 'Google AI Studio (kunci 2)',
      apiKeyEnv: 'GOOGLE_AI_API_KEY_2',
      baseUrl: process.env.GOOGLE_AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: process.env.GOOGLE_AI_MODEL || 'gemini-2.0-flash',
    },
  ],

  /**
   * Status HTTP yang dianggap "provider ini sedang tidak bisa" →
   * langsung coba provider berikutnya (limit, kuota, server down).
   */
  FALLBACK_STATUS: [402, 429, 500, 502, 503, 504],

  // — Kepribadian bot —
  PERSONA: {
    NAME: 'Neko',
    // Deskripsi karakter. Ini yang paling sering diubah.
    CHARACTER: 'asisten server yang ramah, santai, sedikit playful tapi tidak lebay',
    // Gaya bahasa jawaban.
    LANGUAGE: 'Bahasa Indonesia santai (kamu/aku), tanpa formalitas kaku',
    TONE: 'membantu, singkat, langsung ke inti',
    // Aturan tambahan yang selalu ditempel ke system prompt.
    RULES: [
      'Jawab HANYA berdasarkan dokumen konteks yang diberikan.',
      'Kalau info tidak ada di konteks, bilang belum tersedia — jangan mengarang angka, nama item, atau nama command.',
      'Sebut command dengan format lengkap, misal `/bank deposit <jumlah>`.',
      'Kalau user butuh data pribadinya (saldo, level, quest), arahkan ke command yang tepat — kamu tidak membaca database.',
      'Fitur bertanda [belum ada] adalah rencana, jangan dijanjikan sebagai fitur yang sudah jalan.',
      'Jangan pakai heading markdown besar; pakai paragraf pendek atau bullet.',
      'Maksimal sekitar 6 bullet atau 3 paragraf pendek.',
    ],
  },

  // — Parameter generasi —
  TEMPERATURE: 0.4,
  MAX_TOKENS: 700,
  /** Batas karakter jawaban sebelum dipotong (limit embed Discord 4096). */
  MAX_ANSWER_CHARS: 3800,

  // — Batas pemakaian —
  /** Jeda antar pertanyaan per user (ms). */
  COOLDOWN_MS: 15 * 1000,
  /** Panjang maksimum pertanyaan user. */
  MAX_QUESTION_CHARS: 500,
  /** Timeout request ke SATU provider (ms). */
  REQUEST_TIMEOUT_MS: 30 * 1000,

  // — Konteks —
  /** File pengetahuan, relatif dari root project. Boleh lebih dari satu. */
  CONTEXT_FILES: ['Docs/ai.md'],
  /** Potong konteks kalau kebablasan panjang (hemat token). */
  MAX_CONTEXT_CHARS: 60000,
  /** Cache konteks di memori (ms). 0 = baca file tiap pertanyaan. */
  CONTEXT_CACHE_MS: 5 * 60 * 1000,

  /** Jawaban hanya terlihat oleh penanya (true) atau semua orang (false). */
  EPHEMERAL: false,

  /** Tampilkan nama provider + model di footer embed. */
  SHOW_PROVIDER: true,
};

module.exports = { AI };
