const {
  SlashCommandBuilder,
  InteractionContextType,
  ApplicationIntegrationType
} = require('discord.js');
const verification = require('../utils/verification');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Honeypot doğrulama sorusunun cevabını gönderir.')
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .addIntegerOption(option =>
      option
        .setName('answer')
        .setDescription('Matematik sorusunun cevabı')
        .setRequired(true)
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction 
   */
  async execute(interaction) {
    const answer = interaction.options.getInteger('answer', true);

    // Retrieve guild whether inside server or in DM
    const guild = interaction.guild ||
      interaction.client.guilds.cache.get(config.guildId) ||
      await interaction.client.guilds.fetch(config.guildId).catch(() => null);

    // Ephemeral inside server, normal inside direct message
    const isEphemeral = !!interaction.guild;
    await interaction.deferReply({ ephemeral: isEphemeral });

    const result = await verification.checkAnswer(guild, interaction.user.id, answer);

    await interaction.editReply({
      content: result.message
    });
  }
};
