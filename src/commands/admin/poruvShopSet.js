const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const {
  getPoruvShopItems,
  addPoruvShopItem,
  editPoruvShopItem,
  removePoruvShopItem,
} = require('../../database');
const { themedEmbed, errorEmbed, successEmbed, COLORS } = require('../../ui/embeds');
const { e, parseEmojiInput } = require('../../lib/emojis');
const log = require('../../lib/logger').scope('PoruvShopSet');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poruv-shop-set')
    .setDescription('Atur isi katalog /poruv-shop server ini')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc =>
      sc
        .setName('add')
        .setDescription('Tambah item baru ke /poruv-shop')
        .addStringOption(o => o.setName('nama').setDescription('Nama item').setRequired(true).setMaxLength(80))
        .addIntegerOption(o =>
          o.setName('harga').setDescription('Harga dalam Poruv').setRequired(true).setMinValue(1),
        )
        .addStringOption(o =>
          o.setName('emoji').setDescription('Emoji item (pilih lewat emoji picker Discord)').setRequired(true),
        )
        .addStringOption(o =>
          o.setName('deskripsi').setDescription('Deskripsi item').setRequired(false).setMaxLength(200),
        )
        .addBooleanOption(o =>
          o
            .setName('otomatis-mythic')
            .setDescription('Kalau true: redeem langsung kasih 1 item Mythic acak /shop, tanpa antre admin')
            .setRequired(false),
        ),
    )
    .addSubcommand(sc =>
      sc
        .setName('edit')
        .setDescription('Ubah item yang sudah ada di /poruv-shop')
        .addStringOption(o => o.setName('key').setDescription('Key item (lihat /poruv-shop-set list)').setRequired(true))
        .addStringOption(o => o.setName('nama').setDescription('Nama baru').setRequired(false).setMaxLength(80))
        .addIntegerOption(o => o.setName('harga').setDescription('Harga baru dalam Poruv').setRequired(false).setMinValue(1))
        .addStringOption(o => o.setName('emoji').setDescription('Emoji baru').setRequired(false))
        .addStringOption(o => o.setName('deskripsi').setDescription('Deskripsi baru').setRequired(false).setMaxLength(200))
        .addBooleanOption(o =>
          o
            .setName('otomatis-mythic')
            .setDescription('Kalau true: redeem langsung kasih 1 item Mythic acak /shop, tanpa antre admin')
            .setRequired(false),
        ),
    )
    .addSubcommand(sc =>
      sc
        .setName('remove')
        .setDescription('Hapus item dari /poruv-shop')
        .addStringOption(o => o.setName('key').setDescription('Key item (lihat /poruv-shop-set list)').setRequired(true)),
    )
    .addSubcommand(sc => sc.setName('list').setDescription('Lihat semua item /poruv-shop beserta key-nya')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === 'list') {
      const items = getPoruvShopItems(guildId);
      const lines = items.map(
        item => `${e(item.emoji) || parseEmojiInput(item.emoji)?.raw || '🛍️'} **${item.name}** — \`${item.key}\` · ${item.price.toLocaleString()} Poruv · ${item.fulfillment === 'mythic_random' ? 'otomatis' : 'manual'}`,
      );
      const embed = themedEmbed('shop', 'Katalog Poruv Shop', COLORS.points).setDescription(
        lines.join('\n') || 'Belum ada item.',
      );
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'add') {
      const name = interaction.options.getString('nama');
      const price = interaction.options.getInteger('harga');
      const emojiInput = interaction.options.getString('emoji');
      const description = interaction.options.getString('deskripsi') ?? '';
      const mythic = interaction.options.getBoolean('otomatis-mythic') ?? false;

      const parsedEmoji = parseEmojiInput(emojiInput);
      if (!parsedEmoji) {
        return interaction.reply({
          embeds: [errorEmbed('Emoji tidak valid. Pilih emoji lewat picker Discord di kolom `emoji`.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      const key = addPoruvShopItem(guildId, {
        name,
        emoji: parsedEmoji.raw,
        price,
        description,
        fulfillment: mythic ? 'mythic_random' : 'manual',
      });
      log.info(`${interaction.user.tag} menambah item Poruv Shop "${name}" (${key}) di ${guildId}`);

      const embed = successEmbed('Item Ditambahkan', `${parsedEmoji.raw} **${name}** ditambahkan ke /poruv-shop.`).addFields(
        { name: 'Key', value: `\`${key}\``, inline: true },
        { name: 'Harga', value: `${price.toLocaleString()} Poruv`, inline: true },
      );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'edit') {
      const key = interaction.options.getString('key');
      const emojiInput = interaction.options.getString('emoji');
      const mythic = interaction.options.getBoolean('otomatis-mythic');

      let emoji;
      if (emojiInput != null) {
        const parsed = parseEmojiInput(emojiInput);
        if (!parsed) {
          return interaction.reply({
            embeds: [errorEmbed('Emoji tidak valid. Pilih emoji lewat picker Discord di kolom `emoji`.')],
            flags: MessageFlags.Ephemeral,
          });
        }
        emoji = parsed.raw;
      }

      const result = editPoruvShopItem(guildId, key, {
        name: interaction.options.getString('nama') ?? undefined,
        price: interaction.options.getInteger('harga') ?? undefined,
        emoji,
        description: interaction.options.getString('deskripsi') ?? undefined,
        fulfillment: mythic == null ? undefined : mythic ? 'mythic_random' : 'manual',
      });
      if (!result.ok) {
        return interaction.reply({ embeds: [errorEmbed(result.message)], flags: MessageFlags.Ephemeral });
      }
      log.info(`${interaction.user.tag} mengubah item Poruv Shop "${key}" di ${guildId}`);

      const embed = successEmbed('Item Diperbarui', `Item \`${key}\` berhasil diperbarui.`);
      return interaction.reply({ embeds: [embed] });
    }

    // remove
    const key = interaction.options.getString('key');
    const removed = removePoruvShopItem(guildId, key);
    if (!removed) {
      return interaction.reply({
        embeds: [errorEmbed(`Item dengan key \`${key}\` tidak ditemukan. Cek /poruv-shop-set list.`)],
        flags: MessageFlags.Ephemeral,
      });
    }
    log.info(`${interaction.user.tag} menghapus item Poruv Shop "${key}" di ${guildId}`);
    return interaction.reply({ embeds: [successEmbed('Item Dihapus', `Item \`${key}\` sudah dihapus dari /poruv-shop.`)] });
  },
};
                                            
