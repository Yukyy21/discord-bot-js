const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('voice reset replaces cached and persisted sessions atomically, preserves other guild and rewards only new time', () => {
  let now = 1000;
  let fail = false;
  const saved = new Map();
  const rewards = [];
  const db = {
    getAllVoiceSessions: () => [],
    getVoiceSession: (u, g) => saved.get(`${g}:${u}`),
    saveVoiceSession: (u, g, s) => saved.set(`${g}:${u}`, { ...s }),
    deleteVoiceSession: (u, g) => saved.delete(`${g}:${u}`),
    resetGuildMembers(g, fresh) {
      if (fail) throw new Error('rollback');
      for (const key of saved.keys()) if (key.startsWith(`${g}:`)) saved.delete(key);
      for (const s of fresh) db.saveVoiceSession(s.userId, g, s);
      return { users: 2 };
    },
    applyBuff: (u, g, kind, value) => value,
    addPoints: (u, g, value) => rewards.push(['points', u, g, value]),
    addXp() {},
    addQuestProgress() {},
    addVoiceSeconds: (u, g, value) => rewards.push(['seconds', u, g, value]),
    isStaff: () => false,
    addVoiceMinutes() {},
  };
  const guild = id => ({
    id,
    voiceStates: {
      cache: new Map(['u', 'v'].map(id => [id, { id, channelId: 'c', member: { user: { bot: false } } }])),
    },
  });
  const g = guild('g');
  const other = guild('other');
  const module = { exports: {} };
  class Clock extends Date {
    static now() {
      return now;
    }
  }
  const deps = {
    '../database': db,
    '../config/constants': {
      VOICE: {
        MIN_LISTENERS: 2,
        INTERVAL_MS: 1000,
        POINTS_PER_INTERVAL: 1,
        XP_PER_INTERVAL: 1,
        INTERVAL_MINUTES: 1,
      },
    },
    '../lib/levelingManager': { reconcileLevels() {} },
    '../lib/logger': { scope: () => ({ info() {} }) },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/events/voiceStateUpdate.js'), 'utf8'), {
    module,
    Date: Clock,
    setInterval() {},
    require: id => {
      assert.ok(Object.hasOwn(deps, id));
      return deps[id];
    },
  });
  const voice = module.exports;
  voice.restoreVoiceTracking({
    guilds: {
      cache: new Map([
        ['g', g],
        ['other', other],
      ]),
    },
  });
  now = 10000;
  fail = true;
  assert.throws(() => voice.resetGuildMemberData('g', now), /rollback/);
  assert.equal(saved.get('g:u').joinedAt, 1000);
  fail = false;
  g.voiceStates.cache.delete('v');
  voice.resetGuildMemberData('g', now);
  assert.equal(saved.has('g:v'), false);
  assert.equal(saved.get('g:u').joinedAt, now);
  assert.equal(saved.get('g:u').eligible, false);
  assert.equal(saved.get('other:u').joinedAt, 1000);
  now = 12000;
  voice.endSession('g', 'u');
  voice.endSession('g', 'v');
  assert.deepEqual(rewards, [['seconds', 'u', 'g', 2]]);
  voice.endSession('other', 'u');
  assert.ok(rewards.some(row => row[0] === 'seconds' && row[2] === 'other' && row[3] === 11));
});
