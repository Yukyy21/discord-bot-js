const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const path = require('node:path');
const { getProfile, getXpRank } = require('../../db/database');
const { buildProfileCard } = require('../../utils/profileCard');
const { getRank } = require('../../utils/ranks');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Lihat profil lengkap kamu (balance, streak, poin, level)'),
  async execute(interaction) {
    await interaction.deferReply();
    const p = getProfile(interaction.user.id, interaction.guildId);
    const rank = getXpRank(interaction.user.id, interaction.guildId) || 0;
    const rankInfo = getRank(p.level);
    const rankLogo = path.join(__dirname, '..', '..', 'assets', 'ranks', rankInfo.logo);
    const avatar = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });
    const buffer = await buildProfileCard({
      avatar,
      username: interaction.user.displayName,
      level: p.level,
      rank,
      xp: p.xp,
      xpNeeded: p.level * 100,
      balance: p.balance,
      bank: p.bank,
      streak: p.streak,
      points: p.points,
      rankName: rankInfo.name,
      rankLogo,
    });
    const file = new AttachmentBuilder(buffer, { name: 'profile.png' });
    await interaction.editReply({ files: [file] });
  },
};