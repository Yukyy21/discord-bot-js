const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const path = require('node:path');
const { buildRankCard } = require('../../utils/rankCard');
const { getPoints, getProfile, getXpRank } = require('../../db/database');
const { getRank } = require('../../utils/ranks');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Lihat rank & level kamu dalam bentuk gambar'),
  async execute(interaction) {
    try {
      await interaction.deferReply();
    } catch {
      return;
    }
    const p = getProfile(interaction.user.id, interaction.guildId);
    const rank = getXpRank(interaction.user.id, interaction.guildId);
    const rankInfo = getRank(p.level);
    const rankLogo = path.join(__dirname, '..', '..', 'assets', 'ranks', rankInfo.logo);
    const avatar = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });
    const buffer = await buildRankCard({
      avatar,
      username: interaction.user.displayName,
      level: p.level,
      rank,
      xp: p.xp,
      xpNeeded: p.level * 100,
      rankName: rankInfo.name,
      rankLogo,
    });
    const file = new AttachmentBuilder(buffer, { name: 'rank.png' });
    await interaction.editReply({ files: [file] });
  },
};