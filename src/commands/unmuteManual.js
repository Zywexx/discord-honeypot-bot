const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  ApplicationIntegrationType
} = require('discord.js');
const store = require('../utils/store');
const config = require('../config');
const { logAction } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute-manual')
    .setDescription('Doğrulama beklemeden kullanıcının susturmasını manuel olarak kaldırır.')
    .setContexts(InteractionContextType.Guild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Mute durumu kaldırılacak kullanıcı')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction 
   */
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user', true);
    const guild = interaction.guild ||
      interaction.client.guilds.cache.get(config.guildId) ||
      await interaction.client.guilds.fetch(config.guildId).catch(() => null);

    if (!guild) {
      return interaction.reply({
        content: '❌ Sunucu bilgisine ulaşılamadı.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    let member;
    try {
      member = await guild.members.fetch(targetUser.id);
    } catch {
      member = null;
    }

    if (member && config.mutedRoleId) {
      try {
        await member.roles.remove(config.mutedRoleId);
      } catch (err) {
        return interaction.editReply({
          content: `❌ Kullanıcıdan mute rolü kaldırılırken hata oluştu: ${err.message}. Lütfen botun rol sırasının (hiyerarşisinin) mute rolünün üzerinde olduğunu kontrol edin.`
        });
      }
    }

    const pendingMute = store.getPendingMuteByUserId(targetUser.id);
    if (pendingMute) {
      store.updateMuteStatus(pendingMute.id, 'manual_unmute');
    }

    store.addLog(targetUser.id, 'manual_unmute');

    await logAction(guild, targetUser.id, 'manual_unmute', {
      adminId: interaction.user.id,
      reason: 'Yetkili tarafından /unmute-manual komutu ile kaldırıldı.'
    });

    await interaction.editReply({
      content: `✅ <@${targetUser.id}> kullanıcısının susturması başarıyla kaldırıldı.`
    });
  }
};
