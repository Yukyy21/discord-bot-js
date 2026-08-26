// Jembatan ke provider AI (semua OpenAI-compatible chat completions).
//
// Rantai provider: Groq → Google AI Studio (kunci 1) → Google AI Studio (kunci 2).
// Kalau satu provider kena limit / down, otomatis lanjut ke provider berikutnya.
//
// Semua pengaturan rasa (persona, model, batas) ada di src/config/ai.js.
// Kunci API dibaca dari .env dan tidak pernah di-log.
const { AI } = require('../config/ai');
const { getContext } = require('./aiContext');

/** Cooldown per user, disimpan di memori (restart = reset, tidak masalah). */
const lastAsk = new Map();

/** Provider yang punya kunci di .env, urut sesuai prioritas config. */
function activeProviders() {
  return AI.PROVIDERS.filter(p => Boolean(process.env[p.apiKeyEnv]));
}

/** Fitur siap dipakai? */
function isConfigured() {
  return Boolean(AI.ENABLED && activeProviders().length > 0);
}

/** Sisa cooldown user dalam ms (0 = boleh tanya). */
function cooldownLeft(userId) {
  const last = lastAsk.get(userId) || 0;
  return Math.max(0, AI.COOLDOWN_MS - (Date.now() - last));
}

function markAsked(userId) {
  lastAsk.set(userId, Date.now());
  // Jaga map tidak tumbuh selamanya di server besar.
  if (lastAsk.size > 5000) {
    const cutoff = Date.now() - AI.COOLDOWN_MS;
    for (const [id, at] of lastAsk) if (at < cutoff) lastAsk.delete(id);
  }
}

/** System prompt: persona + aturan + isi file konteks. */
function buildSystemPrompt() {
  const { PERSONA } = AI;
  const { text } = getContext();

  return [
    `Kamu adalah ${PERSONA.NAME}, ${PERSONA.CHARACTER}.`,
    `Bahasa jawaban: ${PERSONA.LANGUAGE}. Nada: ${PERSONA.TONE}.`,
    '',
    'Aturan wajib:',
    ...PERSONA.RULES.map(rule => `- ${rule}`),
    '',
    'Berikut dokumen konteks (satu-satunya sumber jawaban):',
    text || '(konteks kosong — bilang ke user kalau basis pengetahuan belum terpasang)',
  ].join('\n');
}

/**
 * Panggil SATU provider.
 * @returns {{ok:true,answer:string,model:string}}
 *        | {ok:false,retry:boolean,message:string}
 *   retry = true berarti boleh lanjut ke provider berikutnya.
 */
async function callProvider(provider, question) {
  const apiKey = process.env[provider.apiKeyEnv];

  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: AI.TEMPERATURE,
        max_tokens: AI.MAX_TOKENS,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: question },
        ],
      }),
      signal: AbortSignal.timeout(AI.REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`[AI] ${provider.label} balas ${response.status}: ${detail.slice(0, 300)}`);
      return {
        ok: false,
        retry: AI.FALLBACK_STATUS.includes(response.status),
        message: providerMessage(response.status, provider),
      };
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    // Jawaban kosong: mungkin cuma provider ini rewel, coba yang lain.
    if (!answer) return { ok: false, retry: true, message: 'AI tidak mengembalikan jawaban. Coba tanya ulang.' };

    return {
      ok: true,
      answer: answer.length > AI.MAX_ANSWER_CHARS
        ? `${answer.slice(0, AI.MAX_ANSWER_CHARS)}…`
        : answer,
      model: data.model || provider.model,
      provider: provider.label,
    };
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.error(`[AI] ${provider.label} timeout.`);
      return { ok: false, retry: true, message: 'AI kelamaan menjawab (timeout). Coba lagi sebentar.' };
    }
    console.error(`[AI] ${provider.label} gagal dihubungi:`, error.message);
    return { ok: false, retry: true, message: 'Gagal menghubungi layanan AI. Coba lagi nanti.' };
  }
}

/**
 * Kirim pertanyaan ke rantai provider. Selalu mengembalikan objek hasil
 * ({ ok, answer } / { ok: false, message }) — tidak pernah throw ke command.
 */
async function ask(question) {
  if (!AI.ENABLED) {
    return { ok: false, message: 'Fitur AI sedang dimatikan (`ENABLED: false` di `src/config/ai.js`).' };
  }

  const providers = activeProviders();
  if (providers.length === 0) {
    const names = AI.PROVIDERS.map(p => `\`${p.apiKeyEnv}\``).join(' / ');
    return { ok: false, message: `Kunci AI belum diisi. Tambahkan salah satu dari ${names} di file \`.env\`.` };
  }

  let lastMessage = 'Semua layanan AI sedang tidak bisa dipakai. Coba lagi nanti.';

  for (const provider of providers) {
    const result = await callProvider(provider, question);
    if (result.ok) return result;

    lastMessage = result.message;
    // Error konfigurasi (kunci salah / model tidak ada) → tidak ada gunanya
    // pindah provider dengan masalah yang sama, langsung laporkan.
    if (!result.retry) return { ok: false, message: result.message };
  }

  return { ok: false, message: `${lastMessage} (semua provider cadangan sudah dicoba)` };
}

/** Pesan yang layak dibaca user untuk tiap status error provider. */
function providerMessage(status, provider) {
  if (status === 401 || status === 403) return `Kunci ${provider.label} ditolak. Periksa \`${provider.apiKeyEnv}\` di \`.env\`.`;
  if (status === 402) return `Kuota ${provider.label} habis.`;
  if (status === 404) return `Model \`${provider.model}\` tidak dikenali ${provider.label}.`;
  if (status === 429) return `${provider.label} kena rate limit.`;
  if (status >= 500) return `${provider.label} sedang bermasalah.`;
  return `Permintaan ke ${provider.label} ditolak. Cek konfigurasi di \`src/config/ai.js\`.`;
}

module.exports = { ask, isConfigured, cooldownLeft, markAsked, buildSystemPrompt, activeProviders };
                                                 
