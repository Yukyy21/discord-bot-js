const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getBetaMode, setBetaMode } = require('../../database');
const { successEmbed } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const log = require('../../lib/logger').scope('Admin');

// Mode beta per-guild (bukan global): tiap server bisa nyala/mati sendiri,
// konsisten dengan pola /boss-channel. Kalau nyala, betaReminder.js numpang
// ephemeral di balasan command/tombol apa pun yang sedang dipakai user
// (bukan pesan terpisah ke satu channel tetap), dengan cooldown 40-90 menit
// per user (tabel beta_reminders) supaya tidak muncul tiap interaksi.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('beta')
    .setDescription('Nyalakan/matikan pengingat mode beta di server ini (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o =>
      o
        .setName('type')
        .setDescription('on = nyalakan pengingat, off = matikan')
        .setRequired(true)
        .addChoices({ name: 'on', value: 'on' }, { name: 'off', value: 'off' }),
    ),
  async execute(interaction) {
    const type = interaction.options.getString('type');
    const guildId = interaction.guildId;
    const enabled = type === 'on';

    if (enabled === getBetaMode(guildId)) {
      return interaction.reply({
        embeds: [
          successEmbed(
            'Mode Beta',
            `${e('betatester')} Pengingat mode beta memang sudah **${enabled ? 'menyala' : 'mati'}** di server ini.`,
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    setBetaMode(guildId, enabled);
    log.info(`${interaction.user.tag} set mode beta guild ${guildId} -> ${enabled ? 'on' : 'off'}`);

    return interaction.reply({
      embeds: [
        successEmbed(
          'Mode Beta Diperbarui',
          enabled
            ? `${e('betatester')} Pengingat mode beta **dinyalakan**. Bot akan sesekali mengingatkan member untuk memakai \`/report\`.`
            : `${e('betatester')} Pengingat mode beta **dimatikan**. Bot berhenti mengirim pengingat otomatis.`,
        ),
      ],
    });
  },
};
  
