const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { BOSS_CATALOG } = require('../../lib/bossCatalog');
const { spawnBoss } = require('../../lib/bossManager');
const log = require('../../lib/logger').scope('Admin');

// Command tes: memaksa boss muncul sekarang tanpa menunggu jadwal jam 00/12.
// Boss yang dipaksa TIDAK memakai kunci jadwal, jadi spawn otomatis berikutnya
// tetap jalan seperti biasa.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-spawn-boss')
    .setDescription('Paksa mini boss muncul sekarang (untuk tes)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o =>
      o
        .setName('boss')
        .setDescription('Boss tertentu. Kosongkan untuk diundi seperti jadwal asli')
        .addChoices(
          ...Object.values(BOSS_CATALOG).map(b => ({
            name: `${b.name} (${b.chance}%${b.special ? ', spesial' : ''})`,
            value: b.key,
          })),
        ),
    ),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const bossKey = interaction.options.getString('boss');
    const result = await spawnBoss(interaction.client, { bossKey });

    if (!result.ok) {
      return interaction.editReply({ embeds: [errorEmbed(result.message)] });
    }

    log.info(`${interaction.user.tag} memaksa spawn ${result.boss.name} di ${interaction.guildId}`);
    return interaction.editReply({
      embeds: [
        successEmbed(
          'Boss Dipanggil',
          `${e('boss')} **${result.boss.name}** sudah muncul di ${result.message.channel}.\n${e('boss_hp')} HP **${result.row.maxHp.toLocaleString('id-ID')}**`,
        ),
      ],
    });
  },
};
