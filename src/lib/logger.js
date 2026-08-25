// Logger satu file tanpa dependency: timestamp + level di tiap baris.
// Filter aktifnya lewat LOG_LEVEL di .env (debug | info | warn | error).
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

// Nama method console, bukan fungsinya — dicari saat dipakai supaya mock/test
// yang menimpa console tetap ikut terpanggil.
const STREAMS = { debug: 'log', info: 'log', warn: 'warn', error: 'error' };

function minLevel() {
  const requested = (process.env.LOG_LEVEL || 'info').toLowerCase();
  // Level tak dikenal jatuh ke info, bukan diam-diam membisukan semuanya.
  return LEVELS[requested] ?? LEVELS.info;
}

/** Waktu lokal mesin berformat `YYYY-MM-DD HH:mm:ss` — log dibaca manusia. */
function formatTimestamp(date) {
  const d = date || new Date();
  const pad = n => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

function shouldLog(level, minimum) {
  return (LEVELS[level] ?? LEVELS.info) >= (minimum ?? minLevel());
}

function write(level, args, minimum) {
  if (!shouldLog(level, minimum)) return;
  // Argumen diteruskan mentah, bukan di-interpolasi: Error sebagai argumen
  // terakhir tetap tercetak dengan stack utuh oleh console.
  console[STREAMS[level]](`${formatTimestamp()} [${level.toUpperCase().padEnd(5)}]`, ...args);
}

/**
 * Logger berawalan modul: scope('Shop').info('Refresh') mencetak
 * `... [INFO ] [Shop] Refresh`. Pengganti awalan `[Shop]` manual.
 */
function scope(prefix) {
  const withScope = (...args) => [`[${prefix}]`, ...args];
  return {
    debug: (...args) => write('debug', withScope(...args)),
    info: (...args) => write('info', withScope(...args)),
    warn: (...args) => write('warn', withScope(...args)),
    error: (...args) => write('error', withScope(...args)),
  };
}

module.exports = {
  LEVELS,
  debug: (...args) => write('debug', args),
  info: (...args) => write('info', args),
  warn: (...args) => write('warn', args),
  error: (...args) => write('error', args),
  scope,
  formatTimestamp,
  shouldLog,
};
