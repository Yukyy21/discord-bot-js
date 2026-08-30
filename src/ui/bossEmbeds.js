// Tampilan mini boss: embed pengumuman spawn, tombol serang, dan embed hasil.
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { themedEmbed, baseEmbed, progressLine, COLORS, DIVIDER } = require('./embeds');
const { e, eo, medal } = require('../lib/emojis');
const { itemEmoji } = require('../lib/itemEmojis');
const { getBoss } = require('../lib/bossCatalog');
const { bossIcon, bossIconFiles } = require('../lib/bossIcons');
const { BOSS } = require('../config/constants');
const { describeDebuff } = require('../lib/bossAttacks');

const ROLE_LABEL = {
  top1: 'Damager #1',
  top2: 'Damager #2',
  top3: 'Damager #3',
  last_hit: 'Last Hit',
};

const num = n => Number(n || 0).toLocaleString('id-ID');

/** Baris tombol serang. bossId ikut di customId supaya tahan restart bot. */
function attackRow(bossId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`boss_attack:${bossId}`)
      .setLabel(disabled ? 'Boss sudah tumbang' : 'Serang!')
      .setEmoji(eo('boss_hit') ?? eo('boss'))
      .setStyle(disabled ? ButtonStyle.Secondary : ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

/** Embed boss yang sedang hidup — ikut diperbarui tiap kali ada serangan. */
function bossEmbed(row, topDamagers = []) {
  const boss = getBoss(row.bossKey);
  const cooldown = Math.round(BOSS.ATTACK_COOLDOWN_MS / 1000);
  const embed = themedEmbed('boss', `${boss.name} muncul!`, boss.color)
    .setDescription(
      [
        boss.special ? `${e('boss_loot')} **Boss spesial!** Loot dan hadiahnya paling besar.` : boss.flavor,
        DIVIDER,
        `${e('boss_hp')} **HP** ${num(row.hp)} / ${num(row.maxHp)}`,
        progressLine(row.hp, row.maxHp, 12),
      ].join('\n'),
    )
    .addFields(
      {
        name: `${e('boss')} Cara ikut`,
        value:
          `Klik **Serang!** — kamu tidak punya HP, jadi tidak ada risiko mati.\n` +
          `Jeda tiap serangan **${cooldown} detik**.\n` +
          `${e('warn')} Tapi boss bisa **membalas**: kena kutukan, cooldown molor, atau coin dirampas. Cek \`/buffs\`.`,
        inline: false,
      },
      {
        name: `${e('boss_loot')} Hadiah`,
        value: `Top 3 damager + pemberi **last hit** dapat coin, XP, poin, dan peluang item.`,
        inline: false,
      },
    );

  const icon = bossIcon(row.bossKey);
  if (icon) embed.setThumbnail(icon.url);

  if (topDamagers.length) {
    embed.addFields({
      name: `${e('leaderboard')} Damage Teratas`,
      value: topDamagers
        .slice(0, 3)
        .map((row2, i) => `${medal(i)} <@${row2.userId}> — **${num(row2.damage)}**`)
        .join('\n'),
      inline: false,
    });
  }

  embed.addFields({
    name: `${e('clock')} Kabur pada`,
    value: `<t:${Math.floor(row.endsAt / 1000)}:R>`,
    inline: false,
  });

  return embed;
}

/** Baris deskripsi satu serangan balik boss. */
function counterLines(counter) {
  const lines = [`${e('boss_hit')} **${counter.attack.name}!** ${counter.attack.text}`];
  if (counter.stolen > 0) lines.push(`${e('coin')} Coin hilang: **${num(counter.stolen)}**`);
  for (const row of counter.applied) lines.push(`${e('warn')} ${describeDebuff(row)}`);
  return lines;
}

/** Embed pengumuman boss mengamuk ke beberapa penyerang sekaligus. */
function bossRampageEmbed(row, hits) {
  const boss = getBoss(row.bossKey);
  const embed = themedEmbed('boss_hit', `${boss.name} Mengamuk!`, COLORS.warn).setDescription(
    [`${e('boss')} **${boss.name}** balas menyerang para penyerangnya.`, DIVIDER].join('\n'),
  );
  for (const hit of hits) {
    embed.addFields({
      name: `${hit.attack.name}`,
      value: [`<@${hit.userId}>`, ...counterLines(hit).slice(1), hit.attack.text].join('\n'),
      inline: false,
    });
  }
  embed.setFooter({ text: 'Kutukan bisa dibersihkan dengan Chrono Core (Time Skip)' });
  const icon = bossIcon(row.bossKey);
  if (icon) embed.setThumbnail(icon.url);
  return embed;
}

/** Balasan ephemeral setelah satu serangan. */
function attackResultEmbed(row, result, { multiplier = 1, debuff = 1, missed = false, counter = null } = {}) {
  const boss = getBoss(row.bossKey);
  const lines = [
    `${e('boss')} Kamu menyerang **${boss.name}** dan memberi **${num(result.dealt)}** damage.`,
    `${e('boss_hp')} Sisa HP boss: **${num(result.hpLeft)}** / ${num(row.maxHp)}`,
    `${e('info')} Total damage-mu: **${num(result.totalDamage)}** dari ${result.hits}× serangan`,
  ];
  if (multiplier > 1) lines.push(`${e('buff_active')} Buff **boss damage** aktif ×${multiplier}`);
  if (debuff < 1) lines.push(`${e('warn')} Debuff **damage** aktif ×${debuff}`);
  if (missed) {
    lines[0] = `${e('warn')} Kamu masih linglung — seranganmu **meleset** dan tidak memberi damage.`;
  }
  if (counter) lines.push(DIVIDER, ...counterLines(counter));
  const embed = baseEmbed()
    .setColor(boss.color)
    .setTitle(`${e('boss')} Serangan Masuk`)
    .setDescription(lines.join('\n'));
  const icon = bossIcon(row.bossKey);
  if (icon) embed.setThumbnail(icon.url);
  return embed;
}

/** Embed hasil akhir: boss tumbang + daftar penerima hadiah. */
function bossDefeatedEmbed(row, rewards, totalHits = 0) {
  const boss = getBoss(row.bossKey);
  const embed = themedEmbed('boss_loot', `${boss.name} Tumbang!`, COLORS.success).setDescription(
    [
      `${e('success')} Boss dikalahkan oleh **${rewards.length}** penerima hadiah dari total **${totalHits}** serangan.`,
      row.lastHitUserId ? `${e('boss')} Last hit: <@${row.lastHitUserId}>` : null,
      DIVIDER,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  const icon = bossIcon(row.bossKey);
  if (icon) embed.setThumbnail(icon.url);

  for (const reward of rewards) {
    const loot = reward.loot.length
      ? reward.loot
          .map(d => `${itemEmoji(d.name)} ${d.name}${d.amount > 1 ? ` ×${d.amount}` : ''}`)
          .join(', ')
      : '_tidak dapat item_';
    embed.addFields({
      name: `${reward.roles.map(r => ROLE_LABEL[r]).join(' + ')} — ${num(reward.damage)} damage`,
      value: [
        `<@${reward.userId}>`,
        `${e('coin')} **${num(reward.coin)}** coin ${e('xp')} **${num(reward.xp)}** XP ${e('point')} **${num(reward.points)}** poin`,
        `${e('boss_loot')} ${loot}`,
      ].join('\n'),
      inline: false,
    });
  }

  if (!rewards.length) {
    embed.addFields({ name: 'Hadiah', value: 'Tidak ada penyerang yang tercatat.', inline: false });
  }
  return embed;
}

/** Embed saat boss kabur karena tidak dikalahkan sampai batas waktu. */
function bossEscapedEmbed(row) {
  const boss = getBoss(row.bossKey);
  const embed = themedEmbed('boss', `${boss.name} Kabur`, COLORS.warn).setDescription(
    `${e('warn')} Tidak ada yang berhasil menghabisi **${boss.name}**. Sisa HP **${num(row.hp)}** / ${num(row.maxHp)}.\nHadiah tidak dibagikan. Tunggu spawn berikutnya.`,
  );
  const icon = bossIcon(row.bossKey);
  if (icon) embed.setThumbnail(icon.url);
  return embed;
}

module.exports = {
  attackRow,
  bossIconFiles,
  bossEmbed,
  attackResultEmbed,
  bossRampageEmbed,
  counterLines,
  bossDefeatedEmbed,
  bossEscapedEmbed,
};
