const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, db } = require('../../db/database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Transfer coin ke user lain')
    .addUserOption(o => o.setName('user').setDescription('Penerima').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Jumlah coin').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const from = interaction.user.id;
    const guildId = interaction.guildId;

    if (target.id === from) {
      return interaction.reply({ embeds: [errorEmbed('Tidak bisa transfer ke diri sendiri.')], flags: MessageFlags.Ephemeral });
    }
    if (target.bot) {
      return interaction.reply({ embeds: [errorEmbed('Tidak bisa transfer ke bot.')], flags: MessageFlags.Ephemeral });
    }

    const sender = getUser(from, guildId);
    if (sender.balance < amount) {
      return interaction.reply({
        embeds: [errorEmbed(`Saldo tidak cukup. Punyamu: **${sender.balance.toLocaleString()} coin**.`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    const transfer = db.transaction(() => {
      getUser(target.id, guildId);
      db.prepare('UPDATE users SET balance = balance - ? WHERE userId = ? AND guildId = ?').run(amount, from, guildId);
      db.prepare('UPDATE users SET balance = balance + ? WHERE userId = ? AND guildId = ?').run(amount, target.id, guildId);
    });
    transfer();

    const embed = successEmbed('💸 Transfer Berhasil', `${interaction.user} mentransfer **${amount.toLocaleString()} coin** ke ${target}!`);
    await interaction.reply({ embeds: [embed] });
  },
};