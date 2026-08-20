const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, updateBalance, db } = require('../../db/database');
const { successEmbed, infoEmbed } = require('../../utils/embeds');

const BASE_REWARD = 500;
const STREAK_BONUS = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Klaim reward harian, makin rajin makin besar'),
  async execute(interaction) {
    const user = getUser(interaction.user.id, interaction.guildId);
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const lastKey = user.lastDaily ? user.lastDaily.slice(0, 10) : null;

    if (lastKey === todayKey) {
      const embed = infoEmbed('⏳ Cooldown', 'Kamu sudah klaim hari ini. Coba lagi besok!');
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    let streak = 1;
    if (lastKey) {
      const yesterday = new Date(now.getTime() - DAY_MS).toISOString().slice(0, 10);
      if (lastKey === yesterday) streak = user.streak + 1;
    }

    const reward = BASE_REWARD + (streak - 1) * STREAK_BONUS;

    const claim = db.transaction(() => {
      updateBalance(interaction.user.id, interaction.guildId, reward);
      db.prepare('UPDATE users SET streak = ?, lastDaily = ? WHERE userId = ? AND guildId = ?')
        .run(streak, todayKey, interaction.user.id, interaction.guildId);
    });
    claim();

    const embed = successEmbed('🎉 Daily Claimed', `Kamu mendapat **${reward.toLocaleString()} coin**!`)
      .addFields({ name: '🔥 Daily Streak', value: `${streak} hari`, inline: true });
    await interaction.reply({ embeds: [embed] });
  },
};