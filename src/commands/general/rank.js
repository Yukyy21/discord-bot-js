const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { asset } = require('../../lib/paths');
const { buildRankCard } = require('../../cards/rankCard');
const { getProfile, getXpRank } = require('../../database');
const { getRank } = require('../../lib/ranks');
const { xpForLevel } = require('../../config/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Lihat rank & level kamu dalam bentuk gambar'),
  async execute(interaction) {
    await interaction.deferReply();
    const p = getProfile(interaction.user.id, interaction.guildId);
    const rank = getXpRank(interaction.user.id, interaction.guildId) || 0;
    const rankInfo = getRank(p.level);
    const rankLogo = asset('ranks', rankInfo.logo);
    const avatar = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });
    const buffer = await buildRankCard({
      avatar,
      username: interaction.user.displayName,
      level: p.level,
      rank,
      xp: p.xp,
      xpNeeded: xpForLevel(p.level),
      rankName: rankInfo.name,
      rankLogo,
    });
    const file = new AttachmentBuilder(buffer, { name: 'rank.png' });
    await interaction.editReply({ files: [file] });
  },
};
