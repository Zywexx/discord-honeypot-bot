const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  ApplicationIntegrationType,
  EmbedBuilder
} = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute-rol-olustur')
    .setDescription('Mute rolünü otomatik oluşturur ve tüm kanalların izinlerini kapatır (Tek seferlik).')
    .setContexts(InteractionContextType.Guild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction 
   */
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Bu komut yalnızca bir sunucu içerisinde kullanılabilir.',
        ephemeral: true
      });
    }

    // Yetki kontrolü: Sadece Yönetici veya Rolleri Yönet yetkisine sahip kişiler
    const hasPerm = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
                    interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles);
    if (!hasPerm) {
      return interaction.reply({
        content: '❌ Bu komutu kullanmak için `Yönetici` veya `Rolleri Yönet` yetkisine sahip olmalısınız.',
        ephemeral: true
      });
    }

    // .env kontrolü: MUTED_ROLE_ID dolu ise komut çalıştırılamaz
    if (config.mutedRoleId && config.mutedRoleId.trim() !== '') {
      return interaction.reply({
        content: `❌ **Bu komut kullanılamaz!**\n\`.env\` dosyasında zaten \`MUTED_ROLE_ID\` parametresi tanımlı (\`${config.mutedRoleId}\`). Bu komut sadece tek seferlik ilk kurulum için tasarlanmıştır.`,
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // 1. Yeni Mute Rolünü Oluştur
      const role = await interaction.guild.roles.create({
        name: 'Susturuldu',
        color: 0x808080,
        reason: 'Honeypot güvenlik botu için otomatik susturma rolü',
        permissions: []
      });

      console.log(`[Setup] "${role.name}" rolü oluşturuldu (ID: ${role.id}).`);

      // 2. Sunucudaki tüm kanallarda izinleri kapat
      let updatedChannelsCount = 0;
      const channels = interaction.guild.channels.cache;

      for (const channel of channels.values()) {
        try {
          if (channel.isTextBased()) {
            await channel.permissionOverwrites.edit(role, {
              SendMessages: false,
              AddReactions: false,
              CreatePublicThreads: false,
              CreatePrivateThreads: false,
              SendMessagesInThreads: false
            });
            updatedChannelsCount++;
          } else if (channel.isVoiceBased()) {
            await channel.permissionOverwrites.edit(role, {
              Speak: false,
              SendMessages: false,
              AddReactions: false
            });
            updatedChannelsCount++;
          }
        } catch (channelErr) {
          console.warn(`[Setup] ${channel.name} kanalında izinler düzenlenemedi:`, channelErr.message);
        }
      }

      // 3. .env dosyasına MUTED_ROLE_ID'yi otomatik kaydet ve runtime config'i güncelle
      config.setMutedRoleId(role.id);

      // 4. Rol hiyerarşisi uyarısı kontrolü
      const botMember = interaction.guild.members.me;
      const isRoleHigher = botMember && botMember.roles.highest.position > role.position;

      const embed = new EmbedBuilder()
        .setTitle('✅ Mute Rolü Başarıyla Kuruldu')
        .setColor(0x2ECC71)
        .setDescription(
          `Sunucu genelinde susturma rolü oluşturuldu ve **${updatedChannelsCount}** kanalda yazma/konuşma izinleri kapatıldı.\n\n` +
          `• **Rol:** <@&${role.id}> (\`${role.name}\`)\n` +
          `• **Rol ID:** \`${role.id}\`\n` +
          `• **.env Güncellemesi:** \`MUTED_ROLE_ID=${role.id}\` otomatik olarak kaydedildi.`
        )
        .addFields({
          name: '⚠️ Önemli Son Adım (Rol Sıralaması)',
          value: isRoleHigher
            ? '✅ Bot rolü bu rolün üzerinde yer alıyor, ek bir sıralama ayarı gerekmiyor.'
            : '👉 **Lütfen Discord Sunucu Ayarları > Roller bölümünden botun rolünü "Susturuldu" rolünün ÜZERİNE taşıyın!** Aksi takdirde Discord botun bu rolü kullanıcılara vermesini engeller.',
          inline: false
        })
        .setFooter({ text: 'Honeypot Kurulum • By Zywexx & 787 INC' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[Setup Error] Mute rolü oluşturulurken hata:', err);
      await interaction.editReply({
        content: `❌ Rol oluşturulurken veya kanal izinleri ayarlanırken bir hata oluştu: ${err.message}`
      });
    }
  }
};
