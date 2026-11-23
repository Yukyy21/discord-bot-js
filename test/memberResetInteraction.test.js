const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const discord = require('discord.js');

function load() {
  let now = 1000;
  const effects = [];
  const module = { exports: {} };
  class Clock extends Date {
    static now() {
      return now;
    }
  }
  const deps = {
    'node:crypto': require('node:crypto'),
    'discord.js': discord,
    '../events/voiceStateUpdate': {
      resetGuildMemberData(...args) {
        effects.push(args);
        return { users: 2 };
      },
    },
    './embeds': { baseEmbed: () => new discord.EmbedBuilder() },
    '../lib/logger': { info() {}, error() {} },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/ui/memberReset.js'), 'utf8'), {
    module,
    Date: Clock,
    require: id => {
      assert.ok(Object.hasOwn(deps, id));
      return deps[id];
    },
  });
  return {
    ...module.exports,
    effects,
    setTime: value => {
      now = value;
    },
  };
}

function interaction(customId, { admin = true, userId = 'a', guildId = 'g', defer } = {}) {
  const calls = {};
  const result = {
    customId,
    guildId,
    user: { id: userId },
    calls,
    memberPermissions: new discord.PermissionsBitField(
      admin ? [discord.PermissionFlagsBits.Administrator] : [],
    ),
  };
  for (const method of ['reply', 'update', 'editReply', 'deferUpdate'])
    result[method] = async payload => {
      calls[method] = payload || true;
      if (method === 'deferUpdate') await defer?.();
    };
  return result;
}

async function open(flow, options) {
  const request = interaction('members_reset', options);
  await flow.handleMemberReset(request);
  const buttons = request.calls.reply.components[0].toJSON().components;
  return { confirm: buttons[0].custom_id, cancel: buttons[1].custom_id, payload: request.calls.reply };
}
const description = payload => payload.embeds[0].toJSON().description;

test('admin-only prompt explicitly includes staff and preservation scope', async () => {
  const flow = load();
  for (const options of [{ admin: false }, { guildId: null }]) {
    const request = interaction('members_reset', options);
    await flow.handleMemberReset(request);
    assert.equal(request.calls.reply.flags, discord.MessageFlags.Ephemeral);
    assert.equal(request.calls.reply.components, undefined);
  }
  const { payload } = await open(flow);
  assert.equal(payload.flags, discord.MessageFlags.Ephemeral);
  assert.match(description(payload), /keanggotaan staff, rating dan aktivitas staff/);
  assert.match(description(payload), /arsip season/);
  assert.match(description(payload), /60 detik/);
  assert.equal(flow.effects.length, 0);
});

test('confirmation and cancellation are initiator/guild bound and permission is checked again', async () => {
  const flow = load();
  const ids = await open(flow);
  for (const id of [ids.confirm, ids.cancel]) {
    for (const options of [{ userId: 'other' }, { guildId: 'other' }, { admin: false }]) {
      const request = interaction(id, options);
      await flow.handleMemberReset(request);
      assert.ok(request.calls.reply);
      assert.equal(flow.effects.length, 0);
    }
  }
  await flow.handleMemberReset(interaction(ids.confirm));
  assert.deepEqual(flow.effects, [['g', 1000]]);
  const replay = interaction(ids.confirm);
  await flow.handleMemberReset(replay);
  assert.match(description(replay.calls.reply), /tidak valid/);
  assert.equal(flow.effects.length, 1);
});

test('cancel and expiry never invoke reset', async () => {
  const flow = load();
  const first = await open(flow);
  const cancel = interaction(first.cancel);
  await flow.handleMemberReset(cancel);
  assert.match(description(cancel.calls.update), /dibatalkan/);
  const replay = interaction(first.confirm);
  await flow.handleMemberReset(replay);
  assert.ok(replay.calls.reply);
  const second = await open(flow);
  flow.setTime(61000);
  const expired = interaction(second.confirm);
  await flow.handleMemberReset(expired);
  assert.ok(expired.calls.reply);
  assert.equal(flow.effects.length, 0);
});

test('rechecks expiry after acknowledgement and prevents concurrent replay and competing confirmations', async () => {
  const flow = load();
  const expired = await open(flow);
  await flow.handleMemberReset(interaction(expired.confirm, { defer: () => flow.setTime(61000) }));
  assert.equal(flow.effects.length, 0);
  const first = await open(flow);
  const second = await open(flow, { userId: 'b' });
  await Promise.all([
    flow.handleMemberReset(interaction(first.confirm)),
    flow.handleMemberReset(interaction(first.confirm)),
  ]);
  await flow.handleMemberReset(interaction(second.confirm, { userId: 'b' }));
  assert.equal(flow.effects.length, 1);
});
