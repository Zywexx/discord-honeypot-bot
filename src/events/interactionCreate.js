const {
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');
const verification = require('../utils/verification');
const config = require('../config');

module.exports = {
  name: Events.InteractionCreate,
  /**
   * @param {import('discord.js').Interaction} interaction 
   */
  async execute(interaction) {
    try {
      // 1. Handle Slash Commands
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
          console.warn(`[Interaction] No command matching ${interaction.commandName} was found.`);
          return;
        }

        await command.execute(interaction);
        return;
      }

      // 2. Handle "Cevapla" Button Click -> Show Modal
      if (interaction.isButton() && interaction.customId === 'open_verify_modal') {
        const modal = new ModalBuilder()
          .setCustomId('verify_modal')
          .setTitle('Honeypot Doğrulama');

        const answerInput = new TextInputBuilder()
          .setCustomId('verify_answer_input')
          .setLabel('Matematik Sorusunun Cevabı')
          .setPlaceholder('Örn: 11')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(6);

        const actionRow = new ActionRowBuilder().addComponents(answerInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
        return;
      }

      // 3. Handle Modal Submission
      if (interaction.isModalSubmit() && interaction.customId === 'verify_modal') {
        const submittedAnswer = interaction.fields.getTextInputValue('verify_answer_input');
        const guild = interaction.guild ||
          interaction.client.guilds.cache.get(config.guildId) ||
          await interaction.client.guilds.fetch(config.guildId).catch(() => null);

        const isEphemeral = !!interaction.guild;
        await interaction.deferReply({ ephemeral: isEphemeral });

        const result = await verification.checkAnswer(guild, interaction.user.id, submittedAnswer);

        await interaction.editReply({
          content: result.message
        });
      }
    } catch (err) {
      console.error('[Interaction Error]', err);
      const replyContent = '❌ İşlem gerçekleştirilirken bir hata oluştu.';
      if (interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: replyContent }).catch(() => {});
        } else {
          await interaction.reply({ content: replyContent, ephemeral: true }).catch(() => {});
        }
      }
    }
  }
};
