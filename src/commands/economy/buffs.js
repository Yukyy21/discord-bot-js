const { SlashCommandBuilder } = require('discord.js');
const { getActiveBuffs, getActiveDebuffs, clearExpiredBuffs, GUILD_WIDE } = require('../../database');
const { describeBuff } = require('../../lib/buffs');
const { describeDebuff } = require('../../lib/bossAttacks');
const { themedEmbed, infoEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder().setName('buffs').setDescription('Lihat buff item yang sedang aktif'),
  async execute(interaction) {
    clearExpiredBuffs();
    const now = Date.now();
    const buffs = getActiveBuffs(interaction.user.id, interaction.guildId, now);
    const debuffs = getActiveDebuffs(interaction.user.id, interaction.guildId, now);

    if (buffs.length === 0 && debuffs.length === 0) {
      return interaction.reply({
        embeds: [infoEmbed('Tidak Ada Buff', `${e('info')} Belum ada buff aktif. Pakai item dari \`/inventory\` dulu.`)],
      });
    }

    const lines = buffs.map(buff => {
      const scope = buff.userId === GUILD_WIDE ? ' _(seluruh server)_' : '';
      return `${e('buff_active')} ${describeBuff(buff, now)}${scope}`;
    });

    const embed = themedEmbed('buff', 'Buff & Debuff Aktif', COLORS.points)
      .setDescription(lines.length ? lines.join('\n') : `${e('info')} Tidak ada buff item aktif.`)
      .setFooter({
        text: 'Buff sejenis tidak menumpuk (pengali terbesar); debuff boss juga tidak menumpuk (efek terparah)',
      });

    if (debuffs.length) {
      embed.addFields({
        name: `${e('warn')} Debuff dari Mini Boss`,
        value: debuffs.map(row => `${e('warn')} ${describeDebuff(row, now)}`).join('\n'),
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
