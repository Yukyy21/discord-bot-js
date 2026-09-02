const { SlashCommandBuilder } = require('discord.js');
const { getUser } = require('../../database');
const { themedEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');

module.exports = {
  data: new SlashCommandBuilder().setName('balance').setDescription('Cek saldo kamu (dompet & bank)'),
  async execute(interaction) {
    const user = getUser(interaction.user.id, interaction.guildId);
    const total = user.balance + user.bank;

    const embed = themedEmbed('coin', `Saldo ${interaction.user.displayName}`, COLORS.economy)
      .setThumbnail(interaction.user.displayAvatarURL({ extension: 'png', size: 128 }))
      .setDescription(`Total kekayaan: **${total.toLocaleString()}** ${e('coin')}\n${DIVIDER}`)
      .addFields(
        { name: `${e('coin')} Dompet`, value: `**${user.balance.toLocaleString()}**`, inline: true },
        { name: `${e('bank')} Bank`, value: `**${user.bank.toLocaleString()}**`, inline: true },
        { name: `${e('streak')} Streak`, value: `**${user.streak || 0}** hari`, inline: true },
      )
      .setFooter({ text: 'Tambah coin: /daily • /shop • aktif di chat' });

    await interaction.reply({ embeds: [embed] });
  },
};
