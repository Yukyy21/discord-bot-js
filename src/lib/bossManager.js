// Orkestrasi mini boss di sisi Discord: spawn terjadwal, tombol serang,
// pembagian hadiah, dan despawn. Angka & undian ada di lib/boss.js,
// penyimpanan di database/boss.js.
const { MessageFlags } = require('discord.js');
const {
  getActiveBoss,
  getBossById,
  getAllActiveBosses,
  slotUsed,
  createBoss,
  setBossMessage,
  deleteBoss,
  getContribution,
  getContributions,
  applyDamage,
  expireBoss,
  distributeRewards,
  addQuestProgress,
  getMultiplier,
  getDebuff,
  consumeDebuffCharge,
  applyBossAttack,
  markRampage,
  getBossChannel,
  getAllBossChannels,
} = require('../database');
const {
  pickBoss,
  rollDamage,
  attackCooldownLeft,
  dueSpawnSlot,
  getBoss,
  pickRampageTargets,
} = require('./boss');
const { pickBossAttack, rollCounter } = require('./bossAttacks');
const { BOSS } = require('../config/constants');
const {
  attackRow,
  bossEmbed,
  attackResultEmbed,
  bossDefeatedEmbed,
  bossEscapedEmbed,
  bossRampageEmbed,
  bossIconFiles,
} = require('../ui/bossEmbeds');
const { warnEmbed } = require('../ui/embeds');
const { e } = require('./emojis');
const { reconcileLevels } = require('./levelingManager');
const log = require('./logger').scope('Boss');

const BOSS_CHANNEL_ID = process.env.BOSS_CHANNEL_ID;

// Antrean edit pesan boss per spawn (Bugs.md #7): dua penyerang bersamaan
// tidak boleh menimpa update embed satu sama lain. Semua edit pesan boss
// (embed HP, disable tombol saat despawn/restart) dijalankan serial per
// bossId, dan task selalu membaca ulang state terbaru dari database tepat
// sebelum menulis — jadi tampilan tidak bisa mundur ke HP lama.
const editChains = new Map(); // bossId -> Promise (ekor antrean)

/**
 * Jalankan `task` setelah semua edit boss `bossId` sebelumnya selesai.
 * Error satu task tidak memutus antrean untuk edit berikutnya.
 */
function queueMessageEdit(bossId, task) {
  const tail = editChains.get(bossId) ?? Promise.resolve();
  const next = tail.then(task, task);
  editChains.set(bossId, next.catch(() => {}));
  return next;
}

/** Channel tempat boss muncul. Diatur lewat BOSS_CHANNEL_ID di .env. */
async function resolveBossChannel(client, channelId = BOSS_CHANNEL_ID) {
  if (!channelId) return null;
  try {
    const channel = await client.channels.fetch(channelId);
    return channel?.isTextBased?.() ? channel : null;
  } catch {
    return null;
  }
}

/**
 * Semua pasangan guild → channel boss yang perlu dicek jadwal spawn.
 * Konfigurasi per-guild (tabel guild_config) terlebih dahulu; kalau sedang di
 * satu guild tidak ada konfigurasi, fallback BOSS_CHANNEL_ID tetap dilayani.
 */
function listBossTargets() {
  const targets = [];
  for (const row of getAllBossChannels()) {
    if (row.bossChannelId) targets.push({ guildId: row.guildId, channelId: row.bossChannelId });
  }
  if (BOSS_CHANNEL_ID) targets.push({ guildId: null, channelId: BOSS_CHANNEL_ID });
  return targets;
}

/**
 * Munculkan boss di channel minibos.
 * Prioritas channel: `channel` eksplisit → konfigurasi per-guild
 * (`guildId`, diatur lewat /boss-channel) → fallback `BOSS_CHANNEL_ID`.
 * `bossKey` diisi hanya oleh /admin-spawn-boss; jadwal otomatis mengundi
 * sendiri (Pump Freakin 45%, Clown Orca 45%, Ancient Mummy 10%).
 */
async function spawnBoss(client, { bossKey = null, slot = null, channel = null, guildId = null } = {}) {
  let target = channel;
  if (!target) {
    const configured = guildId ? getBossChannel(guildId) : null;
    target = await resolveBossChannel(client, configured || BOSS_CHANNEL_ID);
  }
  if (!target) {
    return {
      ok: false,
      message:
        'Channel boss belum diatur. Set dengan `/boss-channel set` untuk server ini, atau isi `BOSS_CHANNEL_ID` di `.env`.',
    };
  }

  const existing = getActiveBoss(target.guild.id);
  if (existing) {
    return { ok: false, message: `**${getBoss(existing.bossKey).name}** masih hidup. Habisi dulu bossnya.` };
  }

  const boss = bossKey ? getBoss(bossKey) : pickBoss();
  if (!boss) return { ok: false, message: 'Boss tidak dikenal.' };

  const row = createBoss({
    guildId: target.guild.id,
    channelId: target.id,
    bossKey: boss.key,
    slot,
  });

  let message;
  try {
    message = await target.send({
      content: `${e('boss')} **${boss.name}** muncul di ${target}! Klik **Serang!** untuk ikut.`,
      embeds: [bossEmbed(row)],
      components: [attackRow(row.id)],
      files: bossIconFiles(boss.key),
    });
  } catch (error) {
    return rollbackSpawn(row, error);
  }
  setBossMessage(row.id, message.id);
  log.info(`Spawn ${boss.name} (id ${row.id}) di guild ${target.guild.id}${slot ? ` slot ${slot}` : ''}`);

  return { ok: true, boss, row, message };
}

/**
 * Rollback baris boss yang baru dibuat kalau pesan spawn gagal terkirim.
 * Kalau tidak, baris 'active' menggantung sampai despawn dan memblokir spawn
 * berikutnya di guild itu (getActiveBoss) meski bossnya tak pernah tampil.
 */
async function rollbackSpawn(row, error) {
  try {
    deleteBoss(row.id);
  } catch (deleteErr) {
    log.error(`Gagal rollback boss id ${row.id}:`, deleteErr);
  }
  log.error(`Boss ${row.bossKey} (id ${row.id}) gagal spawn di guild ${row.guildId}:`, error);
  return { ok: false, message: 'Boss gagal muncul (channel tidak bisa dikirimi pesan).' };
}

/** Tombol serang. Player tidak punya HP — hanya boss yang berdarah. */
async function handleBossAttack(interaction, bossId) {
  if (interaction.replied || interaction.deferred) return;
  const row = getBossById(Number(bossId));
  if (!row || row.status !== 'active') {
    return interaction.reply({
      embeds: [warnEmbed('Boss ini sudah selesai. Tunggu spawn berikutnya jam 12 malam atau 12 siang.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  const userId = interaction.user.id;
  const guildId = row.guildId;
  // Cooldown molor kalau user sedang kena debuff `debuff:cooldown` dari boss.
  const cooldownMult = getDebuff(userId, guildId, 'debuff:cooldown');
  const left = attackCooldownLeft(getContribution(row.id, userId)?.lastAttackAt, Date.now(), cooldownMult);
  if (left > 0) {
    return interaction.reply({
      embeds: [
        warnEmbed(
          `${e('clock')} Senjatamu masih dingin. Coba lagi <t:${Math.floor((Date.now() + left) / 1000)}:R>.`,
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const boss = getBoss(row.bossKey);
  // Buff damage dihitung SAAT serangan terjadi, bukan saat boss mati.
  // Urutan: buff item dulu (tidak pernah dibatalkan), baru dikali debuff boss.
  const multiplier = getMultiplier(userId, guildId, 'boss_damage');
  const damageDebuff = getDebuff(userId, guildId, 'debuff:damage');
  // Pukulan Linglung: satu serangan berikutnya meleset (tetap kena cooldown).
  const missed = consumeDebuffCharge(userId, guildId, 'debuff:miss');
  const damage = missed ? 0 : Math.round(rollDamage(boss) * multiplier * damageDebuff);
  const result = applyDamage(row.id, userId, damage);
  if (!result.ok) {
    return interaction.reply({
      embeds: [warnEmbed('Boss sudah tumbang tepat sebelum seranganmu masuk.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // Quest "ikut event": progres dihitung sekali, saat serangan pertama.
  if (result.hits === 1) addQuestProgress(userId, guildId, 'boss_join', 1);

  // Serangan balik boss: boss tidak bisa membunuh player, hanya memasang
  // debuff atau merampas coin.
  let counter = null;
  if (!result.defeated && rollCounter(boss)) {
    const attack = pickBossAttack(boss);
    if (attack) counter = applyBossAttack(userId, guildId, attack.id);
  }

  const after = getBossById(row.id);
  // Ack dulu supaya interaksi tidak pernah timeout (pesan boss sudah bisa
  // berubah banyak), lalu update embed boss diantre per-spawn. Task membaca
  // state terbaru dari DB saat mengeksekusi, jadi dua serangan nyaris
  // bersamaan tidak akan saling menimpa dengan data basi.
  //
  // PENTING: damage sudah di-commit ke DB lewat applyDamage() di atas —
  // kalau boss sudah defeated di sini, finishBoss() harus tetap jalan
  // walaupun langkah UI di bawah (deferUpdate/edit/followUp) gagal, misalnya
  // karena interaksi keburu expire (window ~3 detik dari Discord). Kalau
  // tidak, boss tertinggal berstatus 'defeated' tanpa reward pernah
  // dibagikan, dan scheduler tidak akan menolongnya karena hanya memproses
  // boss yang masih 'active'.
  try {
    await interaction.deferUpdate();
    await queueMessageEdit(row.id, async () => {
      const latest = getBossById(row.id);
      if (!latest) return;
      await interaction.message.edit({
        embeds: [bossEmbed(latest, getContributions(row.id))],
        components: [attackRow(row.id, latest.status !== 'active')],
        // Attachment harus dikirim ulang tiap edit, kalau tidak thumbnail-nya hilang.
        files: bossIconFiles(row.bossKey),
      });
    }).catch(error => log.error(`Gagal update embed boss ${row.id}:`, error.message));
    await interaction.followUp({
      embeds: [attackResultEmbed(after, result, { multiplier, debuff: damageDebuff, missed, counter })],
      files: bossIconFiles(row.bossKey),
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    log.error(`Interaksi serangan boss ${row.id} gagal (kemungkinan expired):`, error.message);
  }

  if (result.defeated) await finishBoss(interaction.client, after);
}

/**
 * Amukan berkala: tiap RAMPAGE_INTERVAL_MS boss menyerang beberapa penyerang
 * teraktif sekaligus. Aturannya sama dengan serangan balik — tidak ada damage
 * ke player, hanya debuff atau coin dirampas.
 */
async function rampageBoss(client, row) {
  const targets = pickRampageTargets(getContributions(row.id));
  if (!targets.length) return [];

  const boss = getBoss(row.bossKey);
  const hits = [];
  for (const target of targets) {
    const attack = pickBossAttack(boss);
    if (!attack) continue;
    const applied = applyBossAttack(target.userId, row.guildId, attack.id);
    if (applied) hits.push({ userId: target.userId, ...applied });
  }
  markRampage(row.id);
  if (!hits.length) return [];

  const channel = await resolveBossChannel(client, row.channelId);
  if (channel) {
    await channel
      .send({
        content: hits.map(h => `<@${h.userId}>`).join(' '),
        embeds: [bossRampageEmbed(row, hits)],
        files: bossIconFiles(row.bossKey),
      })
      .catch(err => log.error('Gagal mengirim amukan boss:', err.message));
  }
  log.info(`Boss ${row.bossKey} (id ${row.id}) mengamuk ke ${hits.length} player`);
  return hits;
}

/** Boss mati: bagi hadiah ke semua peserta (proporsional) + top 3 + last hit, lalu umumkan. */
async function finishBoss(client, row) {
  const contributions = getContributions(row.id);

  // Minimal peserta harus terpenuhi sebelum hadiah dibagikan
  if (contributions.length < BOSS.MIN_PARTICIPANTS) {
    expireBoss(row.id);
    const channel = await resolveBossChannel(client, row.channelId);
    if (channel) {
      const embed = bossDefeatedEmbed(row, [])
        .setDescription(
          `${e('warn')} **${getBoss(row.bossKey).name}** tumbang, tapi peserta cuma **${contributions.length}** (butuh minimal **${BOSS.MIN_PARTICIPANTS}**). Hadiah tidak dibagikan.`,
        );
      await channel
        .send({ embeds: [embed], files: bossIconFiles(row.bossKey) })
        .catch(() => {});
    }
    log.info(
      `Boss ${row.bossKey} (id ${row.id}) tumbang tapi kurang peserta (${contributions.length}/${BOSS.MIN_PARTICIPANTS}) — hadiah tidak dibagikan`,
    );
    editChains.delete(row.id);
    return [];
  }

  const rewards = distributeRewards(row.id);
  const totalHits = contributions.reduce((sum, c) => sum + c.hits, 0);

  for (const reward of rewards) {
    addQuestProgress(reward.userId, row.guildId, 'boss_kill', 1);
  }

  const channel = await resolveBossChannel(client, row.channelId);
  if (channel) {
    await channel
      .send({
        content: rewards.map(r => `<@${r.userId}>`).join(' ') || undefined,
        embeds: [bossDefeatedEmbed(getBossById(row.id), rewards, totalHits)],
        files: bossIconFiles(row.bossKey),
      })
      .catch(err => log.error('Gagal mengirim hasil boss:', err.message));
  }

  // XP dari hadiah boss juga harus memicu level-up seketika, tidak menunggu
  // chat di channel poin berikutnya.
  reconcileLevels(client, row.guildId, rewards.map(r => ({ userId: r.userId })));
  log.info(`Boss ${row.bossKey} (id ${row.id}) tumbang — ${rewards.length} penerima hadiah`);
  editChains.delete(row.id);
  return rewards;
}

/** Boss kabur setelah lewat batas waktu; tombolnya dimatikan. */
async function escapeBoss(client, row) {
  expireBoss(row.id);
  const channel = await resolveBossChannel(client, row.channelId);
  if (!channel) return;
  if (row.messageId) {
    await queueMessageEdit(row.id, async () => {
      const msg = await channel.messages.fetch(row.messageId).catch(() => null);
      if (!msg) return;
      await msg.edit({ components: [attackRow(row.id, true)] });
    }).catch(() => {});
  }
  await channel.send({ embeds: [bossEscapedEmbed(row)], files: bossIconFiles(row.bossKey) }).catch(() => {});
  log.info(`Boss ${row.bossKey} (id ${row.id}) kabur tanpa dikalahkan`);
  editChains.delete(row.id);
}

/** Segarkan embed boss aktif setelah restart supaya tombolnya jalan lagi. */
async function restoreBosses(client) {
  for (const row of getAllActiveBosses()) {
    const channel = await resolveBossChannel(client, row.channelId);
    if (!channel || !row.messageId) continue;
    await queueMessageEdit(row.id, async () => {
      const msg = await channel.messages.fetch(row.messageId).catch(() => null);
      if (!msg) return;
      await msg.edit({
        embeds: [bossEmbed(row, getContributions(row.id))],
        components: [attackRow(row.id)],
        files: bossIconFiles(row.bossKey),
      });
    }).catch(() => {});
  }
}

/**
 * Penjaga jadwal: tiap menit cek apakah sekarang jam spawn (00 & 12 waktu
 * lokal event) dan apakah ada boss yang sudah lewat batas waktunya. Spawn
 * dijalankan untuk SETIAP guild yang punya channel boss (konfigurasi per-guild
 * di tabel guild_config, plus fallback BOSS_CHANNEL_ID).
 */
function startBossScheduler(client) {
  if (!BOSS_CHANNEL_ID && getAllBossChannels().length === 0) {
    log.warn('Belum ada channel boss (konfigurasi per-guild kosong & BOSS_CHANNEL_ID kosong) — boss tidak akan spawn otomatis.');
  }

  const tick = async () => {
    try {
      for (const row of getAllActiveBosses()) {
        if (Date.now() >= row.endsAt) {
          await escapeBoss(client, row);
          continue;
        }
        const last = row.lastRampageAt || row.spawnedAt;
        if (Date.now() - last >= BOSS.RAMPAGE_INTERVAL_MS) await rampageBoss(client, row);
      }

      const slot = dueSpawnSlot();
      if (slot) {
        for (const target of listBossTargets()) {
          try {
            const channel = await resolveBossChannel(client, target.channelId);
            if (!channel) continue;
            if (slotUsed(channel.guild.id, slot)) continue;
            await spawnBoss(client, { slot, channel });
          } catch (error) {
            log.error(`Gagal spawn boss di guild ${target.guildId ?? target.channelId}:`, error);
          }
        }
      }
    } catch (error) {
      log.error('Scheduler boss error:', error);
    }
  };

  tick();
  setInterval(tick, BOSS.CHECK_INTERVAL_MS);
}

module.exports = {
  spawnBoss,
  handleBossAttack,
  finishBoss,
  rampageBoss,
  escapeBoss,
  restoreBosses,
  startBossScheduler,
  resolveBossChannel,
};
