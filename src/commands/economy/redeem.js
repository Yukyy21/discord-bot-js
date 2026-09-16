const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { redeemCode, itemNameById } = require('../../database');
const { reconcileLevels } = require('../../lib/levelingManager');
const { themedEmbed, errorEmbed, COLORS } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { describeRewards } = require('../../lib/redeemCodes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('redeem')
    .setDescription('Tukar redeem code jadi Poruv, XP, coin, buff, atau item')
    .addStringOption(o => o.setName('code').setDescription('Redeem code').setRequired(true).setMaxLength(32)),
  async execute(interaction) {
    const code = interaction.options.getString('code');
    const result = redeemCode(interaction.user.id, interaction.guildId, code);
    if (!result.ok) {
      return interaction.reply({ embeds: [errorEmbed(result.message)], flags: MessageFlags.Ephemeral });
    }

    // Reward XP bisa langsung melewati batas level — rekonsiliasi di sini,
    // sama seperti /use, tidak perlu menunggu chat lagi di channel poin.
    if (result.hasXp) {
      await reconcileLevels(interaction.client, interaction.guildId, [
        { userId: interaction.user.id, channelId: interaction.channelId },
      ]);
    }

    const lines = describeRewards(result.rewards, itemNameById);
    const embed = themedEmbed('success', 'Code Berhasil Ditukar', COLORS.success).setDescription(
      lines.map(l => `${e('success')} ${l}`).join('\n'),
    );
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
        
