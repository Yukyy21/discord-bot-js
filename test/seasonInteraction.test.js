const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const discord = require('discord.js');

const filename = path.join(__dirname, '../src/ui/season.js');
const source = fs.readFileSync(filename, 'utf8');

function loadSeason({ history = [], standings = {} } = {}) {
  let now = 1700000000000;
  let archives = [...history];
  const calls = { history: [], standings: [], effects: [] };
  const database = {
    getSeasonHistory(...args) {
      calls.history.push(args);
      return archives.slice(0, args[1]);
    },
    getSeasonStandings(...args) {
      calls.standings.push(args);
      return standings[args[2]] || [];
    },
    resetSeason(...args) {
      calls.effects.push(['database', ...args]);
      const result = { seasonNumber: (archives[0]?.seasonNumber || 0) + 1, userCount: 3 };
      archives = [result, ...archives];
      return result;
    },
  };
  class Clock extends Date {
    static now() {
      return now;
    }
  }
  const dependencies = {
    'node:crypto': require('node:crypto'),
    'discord.js': discord,
    '../database': database,
    '../events/voiceStateUpdate': {
      resetSeasonVoiceSessions(...args) {
        calls.effects.push(['voice', ...args]);
      },
    },
    './embeds': { baseEmbed: () => new discord.EmbedBuilder() },
    '../lib/logger': { info() {}, error() {} },
  };
  const module = { exports: {} };
  vm.runInNewContext(
    source,
    {
      module,
      Date: Clock,
      require(id) {
        assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency: ${id}`);
        return dependencies[id];
      },
    },
    { filename },
  );
  return {
    ...module.exports,
    calls,
    setTime(value) {
      now = value;
    },
  };
}

function interaction(customId, { admin = true, userId = 'admin-1', guildId = 'guild-1', values = [] } = {}) {
  const calls = { reply: [], update: [], deferUpdate: [], editReply: [] };
  const result = {
    customId,
    guildId,
    user: { id: userId },
    values,
    memberPermissions: new discord.PermissionsBitField(
      admin ? [discord.PermissionFlagsBits.Administrator] : [],
    ),
    calls,
  };
  for (const method of Object.keys(calls)) {
    result[method] = async payload => {
      calls[method].push(payload);
    };
  }
  return result;
}

function description(payload) {
  return payload.embeds[0].toJSON().description;
}

async function openConfirmation(season, options) {
  const request = interaction('season_reset', options);
  await season.handleSeasonButton(request);
  const payload = request.calls.reply[0];
  const buttons = payload.components.flatMap(row => row.toJSON().components);
  const confirmId = buttons.find(button => button.custom_id.startsWith('season_confirm:')).custom_id;
  const cancelId = buttons.find(button => button.custom_id.startsWith('season_cancel:')).custom_id;
  return { request, payload, confirmId, cancelId };
}

test('leaderboard controls keep season reset separate from total reset', () => {
  const season = loadSeason();
  const buttons = season.seasonControls().toJSON().components;
  assert.deepEqual(
    buttons.map(button => button.custom_id),
    ['season_history', 'season_reset', 'members_reset'],
  );
  assert.equal(buttons[2].label, 'Reset Total (Admin)');
});

test('nonadmin reset is denied without reading history or changing data', async () => {
  const season = loadSeason();
  const request = interaction('season_reset', { admin: false });
  await season.handleSeasonButton(request);
  assert.match(description(request.calls.reply[0]), /Hanya Administrator/);
  assert.equal(request.calls.reply[0].flags, discord.MessageFlags.Ephemeral);
  assert.equal(request.calls.deferUpdate.length, 0);
  assert.deepEqual(season.calls.history, []);
  assert.deepEqual(season.calls.effects, []);
});

test('admin opens an ephemeral confirmation with real Discord buttons', async () => {
  const season = loadSeason();
  const { payload, confirmId, cancelId } = await openConfirmation(season);
  assert.equal(payload.flags, discord.MessageFlags.Ephemeral);
  assert.ok(payload.components[0] instanceof discord.ActionRowBuilder);
  assert.ok(payload.components[0].components[0] instanceof discord.ButtonBuilder);
  assert.match(confirmId, /^season_confirm:.+/);
  assert.equal(cancelId.split(':')[1], confirmId.split(':')[1]);
  assert.match(description(payload), /60 detik/);
  assert.deepEqual(season.calls.history, [['guild-1', 1]]);
  assert.deepEqual(season.calls.effects, []);
});

test('cancel clears the confirmation without resetting data', async () => {
  const season = loadSeason();
  const { cancelId, confirmId } = await openConfirmation(season);
  const cancel = interaction(cancelId);
  await season.handleSeasonButton(cancel);
  assert.match(description(cancel.calls.update[0]), /dibatalkan/);
  assert.equal(cancel.calls.update[0].components.length, 0);
  const confirm = interaction(confirmId);
  await season.handleSeasonButton(confirm);
  assert.match(description(confirm.calls.reply[0]), /tidak valid/);
  assert.deepEqual(season.calls.effects, []);
});

test('confirm resets database before rebasing voice memory at the same timestamp', async () => {
  const season = loadSeason({ history: [{ seasonNumber: 4 }] });
  const options = { guildId: 'guild-2', userId: 'admin-2' };
  const { confirmId } = await openConfirmation(season, options);
  const timestamp = 1700000001234;
  season.setTime(timestamp);
  const confirm = interaction(confirmId, options);
  await season.handleSeasonButton(confirm);
  assert.equal(confirm.calls.deferUpdate.length, 1);
  assert.equal(confirm.calls.reply.length, 0);
  assert.deepEqual(season.calls.effects, [
    ['database', 'guild-2', 'admin-2', timestamp],
    ['voice', 'guild-2', timestamp],
  ]);
  assert.deepEqual(season.calls.history, [
    ['guild-2', 1],
    ['guild-2', 1],
  ]);
  assert.match(description(confirm.calls.editReply[0]), /Season 5 telah diarsipkan/);
  assert.match(description(confirm.calls.editReply[0]), /Season 6 dimulai/);
  assert.equal(confirm.calls.editReply[0].components.length, 0);
});

test('a successfully used confirmation cannot be replayed', async () => {
  const season = loadSeason();
  const { confirmId } = await openConfirmation(season);
  await season.handleSeasonButton(interaction(confirmId));
  const replay = interaction(confirmId);
  await season.handleSeasonButton(replay);
  assert.match(description(replay.calls.reply[0]), /tidak valid/);
  assert.equal(replay.calls.reply[0].flags, discord.MessageFlags.Ephemeral);
  assert.equal(season.calls.effects.length, 2);
});

test('another administrator cannot use or cancel the owner confirmation', async () => {
  const season = loadSeason();
  const { confirmId, cancelId } = await openConfirmation(season);
  for (const id of [confirmId, cancelId]) {
    const other = interaction(id, { userId: 'other-admin' });
    await season.handleSeasonButton(other);
    assert.match(description(other.calls.reply[0]), /tidak valid/);
  }
  assert.deepEqual(season.calls.effects, []);
  await season.handleSeasonButton(interaction(confirmId));
  assert.equal(season.calls.effects.length, 2);
});

test('a confirmation cannot be used in another guild', async () => {
  const season = loadSeason();
  const { confirmId } = await openConfirmation(season);
  const other = interaction(confirmId, { guildId: 'other-guild' });
  await season.handleSeasonButton(other);
  assert.match(description(other.calls.reply[0]), /tidak valid/);
  assert.deepEqual(season.calls.effects, []);
});

test('competing confirmations use history version to prevent a second reset', async () => {
  const season = loadSeason({ history: [{ seasonNumber: 7 }] });
  const first = await openConfirmation(season);
  const second = await openConfirmation(season, { userId: 'admin-2' });
  assert.notEqual(first.confirmId, second.confirmId);
  await season.handleSeasonButton(interaction(first.confirmId));
  const competing = interaction(second.confirmId, { userId: 'admin-2' });
  await season.handleSeasonButton(competing);
  assert.match(description(competing.calls.editReply[0]), /sudah direset oleh admin lain/);
  assert.equal(competing.calls.editReply[0].components.length, 0);
  assert.equal(season.calls.history.length, 4);
  assert.equal(season.calls.effects.length, 2);
});

test('confirmation expires at the sixty second boundary', async () => {
  const season = loadSeason();
  const { confirmId } = await openConfirmation(season);
  season.setTime(1700000060000);
  const expired = interaction(confirmId);
  await season.handleSeasonButton(expired);
  assert.match(description(expired.calls.reply[0]), /kedaluwarsa/);
  assert.deepEqual(season.calls.effects, []);
});

test('history shows an ephemeral empty state to nonadmins', async () => {
  const season = loadSeason();
  const request = interaction('season_history', { admin: false });
  await season.handleSeasonButton(request);
  assert.match(description(request.calls.reply[0]), /Belum ada season/);
  assert.equal(request.calls.reply[0].flags, discord.MessageFlags.Ephemeral);
  assert.deepEqual(season.calls.history, [['guild-1', 10]]);
  assert.deepEqual(season.calls.effects, []);
});

test('history builds an archive selector using real Discord builders', async () => {
  const season = loadSeason({ history: [{ seasonNumber: 3 }, { seasonNumber: 2 }] });
  const request = interaction('season_history', { admin: false });
  await season.handleSeasonButton(request);
  const payload = request.calls.reply[0];
  assert.equal(payload.flags, discord.MessageFlags.Ephemeral);
  assert.ok(payload.components[0].components[0] instanceof discord.StringSelectMenuBuilder);
  const select = payload.components[0].toJSON().components[0];
  assert.equal(select.custom_id, 'season_archive');
  assert.deepEqual(
    select.options.map(({ label, value }) => ({ label, value })),
    [
      { label: 'Season 3', value: '3' },
      { label: 'Season 2', value: '2' },
    ],
  );
  assert.deepEqual(season.calls.effects, []);
});

test('archive selection renders five categories, voice hours and empty standings', async () => {
  const season = loadSeason({
    standings: {
      points: [{ userId: 'winner', value: 1250 }],
      voice: [{ userId: 'speaker', value: 5400 }],
    },
  });
  const request = interaction('season_archive', { admin: false, values: ['3'] });
  await season.handleSeasonArchive(request);
  assert.deepEqual(
    season.calls.standings,
    ['points', 'balance', 'bank', 'voice', 'weekly'].map(category => ['guild-1', 3, category, 5]),
  );
  const payload = request.calls.editReply[0];
  const embed = payload.embeds[0].toJSON();
  assert.equal(embed.title, 'Arsip Season 3');
  assert.equal(embed.fields.length, 5);
  assert.equal(embed.fields[0].value, '1. <@winner>: **1.250**');
  assert.equal(embed.fields[1].value, 'Tidak ada data.');
  assert.equal(embed.fields[3].value, '1. <@speaker>: **1.5 jam**');
  assert.equal(payload.allowedMentions.parse.length, 0);
  assert.deepEqual(season.calls.effects, []);
});

test('archive selection ignores invalid season numbers and missing guilds', async () => {
  const season = loadSeason();
  for (const value of ['0', '-1', '1.5', 'invalid', '9007199254740992']) {
    const request = interaction('season_archive', { values: [value] });
    await season.handleSeasonArchive(request);
    assert.equal(request.calls.editReply.length, 0);
  }
  const request = interaction('season_archive', { guildId: null, values: ['1'] });
  await season.handleSeasonArchive(request);
  assert.equal(request.calls.editReply.length, 0);
  assert.deepEqual(season.calls.standings, []);
});
