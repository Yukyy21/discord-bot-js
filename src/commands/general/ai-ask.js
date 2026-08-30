const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { themedEmbed, errorEmbed, warnEmbed, COLORS, DIVIDER } = require('../../ui/embeds');
const { e } = require('../../lib/emojis');
const { AI } = require('../../config/ai');
const { ask, cooldownLeft, markAsked } = require('../../lib/ai');

// Jawaban AI bisa makan beberapa detik, jadi interaksi selalu di-defer dulu
// supaya token tidak kadaluarsa (batas balas awal Discord 3 detik).
// Selama nunggu, user dikasih embed "mikir" pakai emoji ai_think.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai-ask')
    .setDescription('Tanya apa saja soal bot ini, dijawab AI berdasarkan dokumentasi')
    .addStringOption(o =>
      o
        .setName('input')
        .setDescription('Pertanyaanmu, contoh: gimana cara dapat coin?')
        .setRequired(true)
        .setMaxLength(AI.MAX_QUESTION_CHARS),
    ),

  async execute(interaction) {
    const question = interaction.options.getString('input').trim();

    if (question.length < 3) {
      return interaction.reply({
        embeds: [warnEmbed('Pertanyaannya kependekan. Tulis lebih jelas ya.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const wait = cooldownLeft(interaction.user.id);
    if (wait > 0) {
      return interaction.reply({
        embeds: [warnEmbed(`Sabar dulu, tunggu **${Math.ceil(wait / 1000)}s** sebelum tanya lagi.`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply(AI.EPHEMERAL ? { flags: MessageFlags.Ephemeral } : {});

    // Placeholder "sedang mikir" — emoji animasi ai_think.
    const thinking = themedEmbed('ai_think', `${AI.PERSONA.NAME} sedang mikir`, COLORS.info).setDescription(
      [
        `${e('ai_think')} **Pertanyaan diterima**`,
        `> ${question.replace(/\n/g, '\n> ')}`,
        DIVIDER,
        `${e('loading')} Nyusun jawaban dari dokumentasi bot...`,
      ].join('\n'),
    );
    await interaction.editReply({ embeds: [thinking] }).catch(() => {});

    const result = await ask(question);
    if (!result.ok) {
      return interaction.editReply({ embeds: [errorEmbed(result.message)] });
    }

    markAsked(interaction.user.id);

    const footer =
      AI.SHOW_PROVIDER && result.provider
        ? `Dijawab AI dari dokumentasi bot • ${result.provider} • ${result.model}`
        : 'Dijawab AI dari dokumentasi bot';

    const embed = themedEmbed('ai_answer', `Tanya ${AI.PERSONA.NAME}`, COLORS.info)
      .setDescription(
        [
          `${e('ai_think')} **Pertanyaan**`,
          `> ${question.replace(/\n/g, '\n> ')}`,
          DIVIDER,
          `${e('ai_answer')} **Jawaban**`,
          result.answer,
          DIVIDER,
          `${e('ai_answer2')} Butuh detail lain? Tanya lagi pakai \`/ai-ask input:<pertanyaan>\``,
        ].join('\n'),
      )
      .setFooter({ text: footer });

    return interaction.editReply({ embeds: [embed] });
  },
};
