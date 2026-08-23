const { SlashCommandBuilder } = require('discord.js');
const { getActiveBuffs, clearExpiredBuffs, GUILD_WIDE } = require('../../database');
const { describeBuff } = require('../../lib/buffs');
const { themedEmbed, infoEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder().setName('buffs').setDescription('Lihat buff item yang sedang aktif'),
  async execute(interaction) {
    clearExpiredBuffs();
    const now = Date.now();
    const buffs = getActiveBuffs(interaction.user.id, interaction.guildId, now);

    if (buffs.length === 0) {
      return interaction.reply({
        embeds: [infoEmbed('Tidak Ada Buff', `${e('info')} Belum ada buff aktif. Pakai item dari \`/inventory\` dulu.`)],
      });
    }

    const lines = buffs.map(buff => {
      const scope = buff.userId === GUILD_WIDE ? ' _(seluruh server)_' : '';
      return `${e('buff_active')} ${describeBuff(buff, now)}${scope}`;
    });

    const embed = themedEmbed('buff', 'Buff Aktif', COLORS.points)
      .setDescription(lines.join('\n'))
      .setFooter({ text: 'Buff dengan efek sama tidak menumpuk, yang dipakai pengali terbesar' });

    await interaction.reply({ embeds: [embed] });
  },
};
