const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');
const { createRedeemCode, itemNameById } = require('../../database');
const { errorEmbed, successEmbed } = require('../../ui/embeds');
const {
  isValidCode,
  normalizeCode,
  parseAmountField,
  parseBuffField,
  parseItemField,
  describeRewards,
} = require('../../lib/redeemCodes');
const { DAILY } = require('../../config/constants');
const log = require('../../lib/logger').scope('CodeCreate');

// Alur: /code-create (isi code + expired/kuota) -> dropdown pilih jenis
// reward (bisa lebih dari satu) -> modal buat isi nilainya. Modal Discord
// maks 5 text input, jadi dropdown ini juga dibatasi maks 5 pilihan —
// pas dengan 5 jenis reward yang didukung.
const REWARD_TYPES = [
  { value: 'poruv', label: 'Poruv', emoji: '⭐' },
  { value: 'xp', label: 'XP', emoji: '✨' },
  { value: 'coin', label: 'Coin', emoji: '💰' },
  { value: 'buff', label: 'Buff', emoji: '🔺' },
  { value: 'item', label: 'Item (bisa lebih dari 1)', emoji: '🎒' },
];

const FIELD_META = {
  poruv: { label: 'Jumlah Poruv', placeholder: '500', style: TextInputStyle.Short },
  xp: { label: 'Jumlah XP', placeholder: '200', style: TextInputStyle.Short },
  coin: { label: 'Jumlah Coin', placeholder: '1000', style: TextInputStyle.Short },
  buff: { label: 'Buff: key nilai menit', placeholder: 'coin 1.5 60', style: TextInputStyle.Short },
  item: {
    label: 'Item: itemId jumlah (satu baris/item)',
    placeholder: '5 2\n9 1',
    style: TextInputStyle.Paragraph,
  },
};

/** Modal dinamis: cuma field reward yang admin pilih di dropdown sebelumnya. */
function buildRewardModal(code, expiredHari, maxRedeem, types) {
  const modal = new ModalBuilder()
    .setCustomId(`code_create_modal:${code}:${expiredHari}:${maxRedeem}:${types.join(',')}`)
    .setTitle(`Isi Reward — ${code}`.slice(0, 45));

  for (const type of types) {
    const meta = FIELD_META[type];
    const input = new TextInputBuilder()
      .setCustomId(type)
      .setLabel(meta.label)
      .setStyle(meta.style)
      .setPlaceholder(meta.placeholder)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }
  return modal;
}

/** Parser per jenis reward, dipanggil dari handler modal submit di interactionCreate.js. */
function parseReward(type, text) {
  if (type === 'poruv' || type === 'xp' || type === 'coin') {
    const amount = parseAmountField(text);
    return amount == null ? null : { type, amount };
  }
  if (type === 'buff') {
    const buff = parseBuffField(text);
    return buff == null ? null : { type: 'buff', ...buff };
  }
  if (type === 'item') {
    const items = parseItemField(text);
    return items == null ? null : { type: 'item', items };
  }
  return null;
}

/**
 * Proses modal submit code-create: parse tiap field, validasi, simpan code.
 * Dipanggil dari interactionCreate.js (handleModalSubmit). `code`/`expiredHari`
 * (angka hari atau 'x')/`maxRedeem` (angka atau 'x')/`types` (array string)
 * berasal dari customId modal (lihat buildRewardModal).
 */
async function handleModalSubmit(interaction, code, expiredHari, maxRedeem, types) {
  const rewards = [];
  const fieldLabels = { poruv: 'Poruv', xp: 'XP', coin: 'Coin', buff: 'Buff', item: 'Item' };
  for (const type of types) {
    const raw = interaction.fields.getTextInputValue(type);
    const reward = parseReward(type, raw);
    if (!reward) {
      const hint =
        type === 'buff'
          ? 'Format: `key nilai menit`, contoh `coin 1.5 60` (key: coin/xp/points/boss_damage).'
          : type === 'item'
            ? 'Format: satu baris per item, `itemId jumlah`, contoh `5 2`.'
            : 'Harus angka bulat positif.';
      return interaction.reply({
        embeds: [errorEmbed(`Field **${fieldLabels[type]}** tidak valid. ${hint}`)],
        flags: MessageFlags.Ephemeral,
      });
    }
    rewards.push(reward);
  }

  const expiresAt = expiredHari === 'x' ? null : Date.now() + Number(expiredHari) * DAILY.DAY_MS;
  const maxUses = maxRedeem === 'x' ? null : Number(maxRedeem);

  const result = createRedeemCode(interaction.guildId, {
    code,
    createdBy: interaction.user.id,
    expiresAt,
    maxUses,
    rewards,
  });
  if (!result.ok) {
    return interaction.reply({ embeds: [errorEmbed(result.message)], flags: MessageFlags.Ephemeral });
  }
  log.info(`${interaction.user.tag} membuat redeem code "${code}" di ${interaction.guildId}: ${JSON.stringify(rewards)}`);

  const lines = describeRewards(rewards, itemNameById);
  const embed = successEmbed('Redeem Code Dibuat', `Code \`${code}\` siap dipakai lewat \`/redeem\`.`).addFields(
    { name: 'Reward', value: lines.join('\n'), inline: false },
    { name: 'Kedaluwarsa', value: expiresAt ? `<t:${Math.floor(expiresAt / 1000)}:R>` : 'Tidak pernah', inline: true },
    { name: 'Kuota', value: maxUses ? `${maxUses}x` : 'Tanpa batas', inline: true },
  );
  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = {
  REWARD_TYPES,
  buildRewardModal,
  handleModalSubmit,
  data: new SlashCommandBuilder()
    .setName('code-create')
    .setDescription('Buat redeem code baru (Poruv/XP/Coin/Buff/Item)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o =>
      o.setName('code').setDescription('Nama code (3-32 karakter, huruf/angka/-/_)').setRequired(true).setMaxLength(32),
    )
    .addIntegerOption(o =>
      o.setName('expired-hari').setDescription('Kedaluwarsa setelah berapa hari (kosongkan = tidak pernah)').setRequired(false).setMinValue(1),
    )
    .addIntegerOption(o =>
      o.setName('max-redeem').setDescription('Maksimal berapa orang bisa redeem (kosongkan = tanpa batas)').setRequired(false).setMinValue(1),
    ),
  async execute(interaction) {
    const code = normalizeCode(interaction.options.getString('code'));
    if (!isValidCode(code)) {
      return interaction.reply({
        embeds: [errorEmbed('Code harus 3-32 karakter, hanya huruf/angka/`-`/`_`.')],
        flags: MessageFlags.Ephemeral,
      });
    }
    const expiredHari = interaction.options.getInteger('expired-hari');
    const maxRedeem = interaction.options.getInteger('max-redeem');

    const select = new StringSelectMenuBuilder()
      .setCustomId(`code_create_select:${code}:${expiredHari ?? 'x'}:${maxRedeem ?? 'x'}`)
      .setPlaceholder('Pilih reward yang mau dimasukkan (bisa lebih dari satu)')
      .setMinValues(1)
      .setMaxValues(REWARD_TYPES.length)
      .addOptions(REWARD_TYPES.map(t => ({ label: t.label, value: t.value, emoji: t.emoji })));

    await interaction.reply({
      content: `Code \`${code}\` — pilih dulu reward apa saja yang mau dimasukkan, lanjut isi nilainya lewat form.`,
      components: [new ActionRowBuilder().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
  },
};
    
