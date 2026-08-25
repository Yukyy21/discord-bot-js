const test = require('node:test');
const assert = require('node:assert');

const LOGGER_PATH = require.resolve('../src/lib/logger');

/** Muat ulang logger dengan nilai LOG_LEVEL tertentu; undefined = dihapus. */
function freshLogger(logLevel) {
  if (logLevel === undefined) delete process.env.LOG_LEVEL;
  else process.env.LOG_LEVEL = logLevel;
  delete require.cache[LOGGER_PATH];
  return require('../src/lib/logger');
}

test.after(() => {
  delete process.env.LOG_LEVEL;
});

test('timestamp berformat YYYY-MM-DD HH:mm:ss dari waktu lokal', () => {
  const { formatTimestamp } = freshLogger(undefined);
  const d = new Date(2026, 7, 25, 7, 5, 9);
  assert.strictEqual(formatTimestamp(d), '2026-08-25 07:05:09');
});

test('tanpa LOG_LEVEL: debug disembunyikan, info ke atas lolos', () => {
  const logger = freshLogger(undefined);
  assert.strictEqual(logger.shouldLog('debug'), false);
  assert.strictEqual(logger.shouldLog('info'), true);
  assert.strictEqual(logger.shouldLog('warn'), true);
  assert.strictEqual(logger.shouldLog('error'), true);
});

test('LOG_LEVEL=debug membuka semua level', () => {
  const logger = freshLogger('debug');
  for (const level of ['debug', 'info', 'warn', 'error']) {
    assert.strictEqual(logger.shouldLog(level), true);
  }
});

test('LOG_LEVEL=warn menyembunyikan debug dan info', () => {
  const logger = freshLogger('warn');
  assert.strictEqual(logger.shouldLog('debug'), false);
  assert.strictEqual(logger.shouldLog('info'), false);
  assert.strictEqual(logger.shouldLog('warn'), true);
});

test('LOG_LEVEL tidak dikenal jatuh ke info', () => {
  const logger = freshLogger('berisik');
  assert.strictEqual(logger.shouldLog('debug'), false);
  assert.strictEqual(logger.shouldLog('info'), true);
});

test('baris log berisi timestamp, tag level rata, dan isi pesan', t => {
  const logger = freshLogger(undefined);
  const mock = t.mock.method(console, 'log', () => {});
  logger.info('halo', 42);
  assert.strictEqual(mock.mock.callCount(), 1);
  const [prefix, text, number] = mock.mock.calls[0].arguments;
  assert.match(prefix, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \[INFO \]$/);
  assert.strictEqual(text, 'halo');
  assert.strictEqual(number, 42);
});

test('scope menambahkan awalan modul setelah tag level', t => {
  const logger = freshLogger(undefined);
  const mock = t.mock.method(console, 'log', () => {});
  logger.scope('Shop').info('Refreshed — 10 items');
  const [prefix, scopeTag, message] = mock.mock.calls[0].arguments;
  assert.match(prefix, /\[INFO \]$/);
  assert.strictEqual(scopeTag, '[Shop]');
  assert.strictEqual(message, 'Refreshed — 10 items');
});

test('error lewat console.error dan objek Error diteruskan utuh', t => {
  const logger = freshLogger(undefined);
  const mock = t.mock.method(console, 'error', () => {});
  const failure = new Error('meledak');
  logger.error('Command gagal:', failure);
  assert.strictEqual(mock.mock.callCount(), 1);
  const [, message, passed] = mock.mock.calls[0].arguments;
  assert.strictEqual(message, 'Command gagal:');
  assert.strictEqual(passed, failure);
});

test('level di bawah minimum benar-benar tidak menulis apa pun', t => {
  const logger = freshLogger('warn');
  const logMock = t.mock.method(console, 'log', () => {});
  logger.debug('sembunyi');
  logger.info('ikut sembunyi');
  assert.strictEqual(logMock.mock.callCount(), 0);
});
