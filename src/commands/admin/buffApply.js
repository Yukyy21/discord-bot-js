const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { addBuff } = require('../../database');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { BUFF_LABELS } = require('../../lib/buffs');
const { BUFF_APPLY_PRESETS } = require('../../config/constants');
const log = require('../../lib/logger').scope('BuffApply');

// Preset di sini eksklusif — TIDAK bisa didapat dari /shop atau /poruv-shop,
// cuma admin yang bisa memasangnya lewat command ini.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('buff-apply')
    .setDescription('Pasang buff eksklusif admin ke seorang user')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('user').setDescription('Penerima buff').setRequired(true))
    .addStringOption(o =>
      o
        .setName('buff')
        .setDescription('Buff yang mau dipasang')
        .setRequired(true)
        .addChoices(
          ...Object.entries(BUFF_APPLY_PRESETS).map(([value, preset]) => ({ name: preset.label, value })),
        ),
    )
    .addIntegerOption(o =>
      o.setName('duration').setDescription('Durasi buff (menit)').setRequired(true).setMinValue(1),
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const presetKey = interaction.options.getString('buff');
    const durationMinutes = interaction.options.getInteger('duration');
    const guildId = interaction.guildId;

    if (target.bot) {
      return interaction.reply({ embeds: [errorEmbed('Bot tidak punya data buff.')], flags: MessageFlags.Ephemeral });
    }

    const preset = BUFF_APPLY_PRESETS[presetKey];
    if (!preset) {
      return interaction.reply({ embeds: [errorEmbed('Buff tidak dikenal.')], flags: MessageFlags.Ephemeral });
    }

    const durationMs = durationMinutes * 60 * 1000;
    for (const buff of preset.buffs) {
      addBuff(target.id, guildId, { key: buff.key, value: buff.value, durationMs });
    }
    log.info(
      `${interaction.user.tag} memasang buff "${preset.label}" ke ${target.tag} selama ${durationMinutes} menit di ${guildId}`,
    );

    const lines = preset.buffs.map(b => `${BUFF_LABELS[b.key] ?? b.key} ×${b.value}`);
    const embed = themedEmbed(preset.emoji ?? 'buff', 'Buff Dipasang', COLORS.points)
      .setDescription(`${e(preset.emoji ?? 'buff')} **${preset.label}** dipasang ke ${target} selama **${durationMinutes} menit**.`)
      .addFields({ name: 'Efek', value: lines.join('\n'), inline: false });

    return interaction.reply({ embeds: [embed] });
  },
};
          
