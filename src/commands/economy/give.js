const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, transferCoinsWithFee, addQuestProgress, checkGiveLimit, recordGive } = require('../../database');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { GIVE } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Transfer coin ke user lain')
    .addUserOption(o => o.setName('user').setDescription('Penerima').setRequired(true))
    .addIntegerOption(o =>
      o.setName('amount').setDescription('Jumlah coin').setRequired(true).setMinValue(1),
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const senderId = interaction.user.id;
    const guildId = interaction.guildId;

    if (target.id === senderId) {
      return interaction.reply({
        embeds: [errorEmbed('Tidak bisa transfer ke diri sendiri.')],
        flags: MessageFlags.Ephemeral,
      });
    }
    if (target.bot) {
      return interaction.reply({
        embeds: [errorEmbed('Tidak bisa transfer ke bot.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const sender = getUser(senderId, guildId);
    const fee = Math.ceil(amount * GIVE.FEE_RATE);
    const totalCost = amount + fee;
    if (sender.balance < totalCost) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            `Saldo tidak cukup. Butuh **${totalCost.toLocaleString()}** ${e('coin')} (**${amount.toLocaleString()}** + biaya **${fee.toLocaleString()}**). Punyamu: **${sender.balance.toLocaleString()}** ${e('coin')}.`,
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Batas harian /give: jumlah transfer & nominal. Cek sebelum transfer supaya
    // pemakaian tidak dilewati. Reset otomatis tiap ganti hari (waktu lokal event).
    const limit = checkGiveLimit(senderId, guildId, amount);
    if (!limit.ok) {
      const remainingCount = Math.max(0, limit.limitCount - limit.count);
      const remainingCoin = Math.max(0, limit.limitCoin - limit.totalCoin);
      const msg =
        limit.reason === 'count'
          ? `Kamu sudah mencapai batas **${limit.limitCount}×** transfer ${e('give')} hari ini.`
          : `Jumlah ini melewati sisa batas harian **${remainingCoin.toLocaleString()}** ${e('coin')} (maks **${limit.limitCoin.toLocaleString()}** ${e('coin')}/hari).`;
      return interaction.reply({
        embeds: [
          errorEmbed(
            `${msg}\nSisa hari ini: **${remainingCount}×** / **${remainingCoin.toLocaleString()}** ${e('coin')}.`,
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    transferCoinsWithFee(senderId, target.id, guildId, amount, fee);
    recordGive(senderId, guildId, amount);
    addQuestProgress(senderId, guildId, 'give', 1);

    const feePercent = Math.round(GIVE.FEE_RATE * 100);

    const embed = themedEmbed('give', 'Transfer Berhasil', COLORS.economy)
      .setDescription(`${interaction.user} ${e('arrow')} ${target}`)
      .addFields(
        { name: `${e('coin')} Jumlah`, value: `**${amount.toLocaleString()}**`, inline: true },
        { name: `${e('coin')} Biaya (${feePercent}%)`, value: `**${fee.toLocaleString()}**`, inline: true },
        {
          name: `${e('bank')} Sisa Saldomu`,
          value: `**${(sender.balance - totalCost).toLocaleString()}**`,
          inline: true,
        },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
