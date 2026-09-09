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
  bossRampageHitEmbed,
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

// Loop auto-attack aktif per (bossId:userId) -> { timer, count }. Simpan di
// memori proses karena hanya perlu bertahan selama sesi bot berjalan; kalau
// bot restart, user tinggal klik toggle lagi.
const autoAttackLoops = new Map();
const AUTO_ATTACK_MAX = 20;

function autoAttackKey(bossId, userId) {
  return `${bossId}:${userId}`;
}

function stopAutoAttack(bossId, userId) {
  const key = autoAttackKey(bossId, userId);
  const loop = autoAttackLoops.get(key);
  if (loop) clearTimeout(loop.timer);
  autoAttackLoops.delete(key);
}

/**
 * Satu kali serangan (dipakai baik oleh klik tunggal maupun loop auto-attack).
 * Tidak menyentuh objek interaction — hanya database + update embed boss publik.
 * Mengembalikan hasil terstruktur supaya pemanggil bebas merender pesannya sendiri.
 */
async function performAttack(client, row, userId, guildId) {
  const cooldownMult = getDebuff(userId, guildId, 'debuff:cooldown');
  const left = attackCooldownLeft(getContribution(row.id, userId)?.lastAttackAt, Date.now(), cooldownMult);
  if (left > 0) return { ok: false, reason: 'cooldown', left };

  const boss = getBoss(row.bossKey);
  // Buff damage dihitung SAAT serangan terjadi, bukan saat boss mati.
  // Urutan: buff item dulu (tidak pernah dibatalkan), baru dikali debuff boss.
  const multiplier = getMultiplier(userId, guildId, 'boss_damage');
  const damageDebuff = getDebuff(userId, guildId, 'debuff:damage');
  // Pukulan Linglung: satu serangan berikutnya meleset (tetap kena cooldown).
  const missed = consumeDebuffCharge(userId, guildId, 'debuff:miss');
  const damage = missed ? 0 : Math.round(rollDamage(boss) * multiplier * damageDebuff);
  const result = applyDamage(row.id, userId, damage);
  if (!result.ok) return { ok: false, reason: 'gone' };

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

  // Update embed boss publik (HP bar dkk), diantre per-spawn supaya dua
  // serangan nyaris bersamaan tidak saling menimpa dengan data basi.
  queueMessageEdit(row.id, async () => {
    const latest = getBossById(row.id);
    if (!latest || !latest.messageId) return;
    const channel = await resolveBossChannel(client, latest.channelId);
    if (!channel) return;
    const msg = await channel.messages.fetch(latest.messageId).catch(() => null);
    if (!msg) return;
    await msg
      .edit({
        embeds: [bossEmbed(latest, getContributions(row.id))],
        components: [attackRow(row.id, latest.status !== 'active')],
        // Attachment harus dikirim ulang tiap edit, kalau tidak thumbnail-nya hilang.
        files: bossIconFiles(row.bossKey),
      })
      .catch(() => {});
  }).catch(error => log.error(`Gagal update embed boss ${row.id}:`, error.message));

  if (result.defeated) await finishBoss(client, after);

  return { ok: true, boss, result, after, multiplier, damageDebuff, missed, counter };
}

/**
 * Toggle auto-attack. Klik pertama: mulai loop (serang langsung, lalu ulang
 * tiap cooldown) sampai maksimal 20× lalu berhenti otomatis — harus klik lagi
 * buat lanjut. Klik kedua saat loop jalan: matikan loop lebih awal.
 * Satu pesan ephemeral dipakai untuk seluruh loop (di-edit tiap serangan,
 * bukan dikirim baru) biar tidak numpuk. Tanpa gambar boss (kebesaran).
 */
async function handleBossAutoAttack(interaction, bossId) {
  if (interaction.replied || interaction.deferred) return;
  const id = Number(bossId);
  const userId = interaction.user.id;
  const key = autoAttackKey(id, userId);

  // Klik kedua: user sudah punya loop jalan -> matikan.
  if (autoAttackLoops.has(key)) {
    stopAutoAttack(id, userId);
    return interaction.reply({
      embeds: [warnEmbed(`${e('info')} Auto attack dihentikan.`)],
      flags: MessageFlags.Ephemeral,
    });
  }

  const row = getBossById(id);
  if (!row || row.status !== 'active') {
    return interaction.reply({
      embeds: [warnEmbed('Boss ini sudah selesai. Tunggu spawn berikutnya jam 12 malam atau 12 siang.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const guildId = row.guildId;
  const client = interaction.client;

  const state = { count: 0 };
  autoAttackLoops.set(key, { timer: null, count: 0 });

  const renderAndEdit = async payload => {
    try {
      await interaction.editReply(payload);
    } catch (error) {
      log.error(`Gagal update pesan auto-attack boss ${id} untuk ${userId}:`, error.message);
      stopAutoAttack(id, userId);
    }
  };

  const runOnce = async () => {
    const latestRow = getBossById(id);
    if (!latestRow || latestRow.status !== 'active') {
      stopAutoAttack(id, userId);
      return renderAndEdit({ embeds: [warnEmbed('Boss sudah tumbang. Auto attack dihentikan.')] });
    }

    const attack = await performAttack(client, latestRow, userId, guildId);
    if (!attack.ok) {
      if (attack.reason === 'cooldown') {
        // Seharusnya jarang kena karena kita menjadwalkan sesuai cooldown,
        // tapi kalau ada debuff cooldown baru masuk di tengah loop, tunggu sisanya.
        const loop = autoAttackLoops.get(key);
        if (loop) loop.timer = setTimeout(() => runOnce(), attack.left);
        return;
      }
      stopAutoAttack(id, userId);
      return renderAndEdit({ embeds: [warnEmbed('Boss sudah tumbang tepat sebelum seranganmu masuk.')] });
    }

    state.count += 1;
    const loop = autoAttackLoops.get(key);
    if (loop) loop.count = state.count;

    const done = attack.result.defeated || state.count >= AUTO_ATTACK_MAX;
    await renderAndEdit({
      embeds: [
        attackResultEmbed(attack.after, attack.result, {
          multiplier: attack.multiplier,
          debuff: attack.damageDebuff,
          missed: attack.missed,
          counter: attack.counter,
          autoAttack: { count: state.count, max: AUTO_ATTACK_MAX, done, cooldownSec: Math.round(BOSS.ATTACK_COOLDOWN_MS / 1000) },
        }),
      ],
    });

    if (done) {
      stopAutoAttack(id, userId);
      return;
    }

    const cooldownMult = getDebuff(userId, guildId, 'debuff:cooldown');
    const delay = Math.round(BOSS.ATTACK_COOLDOWN_MS * cooldownMult);
    const nextLoop = autoAttackLoops.get(key);
    if (nextLoop) nextLoop.timer = setTimeout(() => runOnce(), delay);
  };

  await runOnce();
}

/**
 * Amukan berkala: tiap RAMPAGE_INTERVAL_MS boss menyerang beberapa penyerang
 * teraktif sekaligus. Aturannya sama dengan serangan balik — tidak ada damage
 * ke player, hanya debuff atau coin dirampas.
 */
/**
 * Amukan boss: dikirim satu-satu lewat DM ke tiap penyerang teraktif, bukan
 * satu embed gabungan di channel boss — biar channel boss tidak menuh-menuhin
 * tiap 5 menit. DM bukan flag ephemeral asli (ephemeral cuma berlaku untuk
 * balasan interaksi, dan amukan ini dipicu scheduler, bukan klik user), tapi
 * efeknya sama: cuma penerimanya sendiri yang lihat.
 * Kalau DM user tertutup, pesan itu dilewati saja (tidak fallback ke channel
 * publik) — sesuai permintaan supaya channel boss tidak ikut menuh-menuhin.
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

  await Promise.allSettled(
    hits.map(async hit => {
      try {
        const user = await client.users.fetch(hit.userId);
        await user.send({ embeds: [bossRampageHitEmbed(row, hit)] });
      } catch (err) {
        log.warn(`Gagal DM amukan boss ke ${hit.userId} (DM tertutup?):`, err.message);
      }
    }),
  );
  log.info(`Boss ${row.bossKey} (id ${row.id}) mengamuk ke ${hits.length} player (dikirim lewat DM)`);
  return hits;
}

/** Boss mati: bagi hadiah ke semua peserta (proporsional) + top 3 + last hit, lalu umumkan. */
async function finishBoss(client, row) {
  // Guard idempoten: cegah reward dobel kalau finishBoss terpanggil dua kali
  // untuk boss yang sama (mis. refactor async atau command force-finish nanti).
  if (getBossById(row.id)?.status !== 'defeated') return [];

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
  // Kalau channel tidak bisa di-resolve (hilang / hak akses dicabut), tombol
  // serang di pesan lama tidak bisa dimatikan — boss sudah expire, jangan
  // return senyap: catat jelas dan tetap bersihkan antrean edit.
  if (!channel) {
    log.warn(
      `Boss ${row.bossKey} (id ${row.id}) kabur tapi channel ${row.channelId} tidak bisa diakses — tombol serang di pesan lama kemungkinan masih tampil aktif.`,
    );
    editChains.delete(row.id);
    return;
  }
  if (row.messageId) {
    await queueMessageEdit(row.id, async () => {
      const msg = await channel.messages.fetch(row.messageId).catch(() => null);
      if (!msg) {
        log.warn(`Boss ${row.bossKey} (id ${row.id}) kabur — pesan boss tidak ditemukan, tombol tidak bisa dimatikan.`);
        return;
      }
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
  handleBossAutoAttack,
  finishBoss,
  rampageBoss,
  escapeBoss,
  restoreBosses,
  startBossScheduler,
  resolveBossChannel,
};
