const {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const config = require('../config');
const store = require('../utils/store');
const messageWiper = require('../utils/messageWiper');
const verification = require('../utils/verification');
const { logAction } = require('../utils/logger');
const { updateWarningMessage } = require('../utils/warningMessage');
const handleDmMessage = require('./messageCreate.dm');

module.exports = {
  name: Events.MessageCreate,
  /**
   * @param {import('discord.js').Message} message 
   */
  async execute(message) {
    if (message.author.bot || message.webhookId) return;

    // Handle DM verification messages
    if (!message.guild) {
      await handleDmMessage(message);
      return;
    }

    // Ignore messages from other servers
    if (config.guildId && message.guild.id !== config.guildId) return;

    // Check if message is in the Honeypot channel
    if (message.channel.id !== config.honeypotChannelId) return;

    const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member) return;

    // 1. Exempt role check (BEFORE deleting and muting)
    const isExempt = member.roles.cache.some(role => config.exemptRoleIds.includes(role.id));
    if (isExempt) {
      console.log(`[Honeypot] Exempt user ${message.author.tag} (${message.author.id}) posted in honeypot. Ignoring.`);
      return;
    }

    console.warn(`[Honeypot Triggered] User ${message.author.tag} (${message.author.id}) wrote in honeypot channel!`);

    // 2. Check if user already has an active pending mute
    const existingPending = store.getPendingMuteByUserId(message.author.id);
    if (existingPending) {
      // User is already pending mute; delete message and wipe new messages without creating duplicate verification
      await message.delete().catch(() => {});
      await messageWiper.deleteRecentMessages(message.guild, message.author.id, config.deleteWindowHours);
      console.log(`[Honeypot] User ${message.author.id} is already in pending mute state. Removed recent messages.`);
      return;
    }

    // 3. Delete triggering message immediately
    await message.delete().catch(err => {
      console.warn('[Honeypot] Failed to delete trigger message:', err.message);
    });

    // 4. Wipe user messages in all accessible channels in the last N hours
    const deletedCount = await messageWiper.deleteRecentMessages(
      message.guild,
      message.author.id,
      config.deleteWindowHours
    );

    // 5. Apply indefinite role-based mute (User remains in server for guaranteed mutual-server DM delivery)
    if (config.mutedRoleId) {
      try {
        await member.roles.add(config.mutedRoleId);
        console.log(`[Honeypot] Assigned muted role to ${message.author.tag}`);
      } catch (err) {
        console.error(`[Honeypot Error] Failed to assign muted role to ${message.author.id}:`, err.message);
      }
    }

    // 6. Record mute in database
    const mutedUserId = store.insertMute(message.author.id, deletedCount);

    // 7. Generate math verification question and record it
    const { question, answer } = verification.generateQuestion();
    store.insertVerification(mutedUserId, question, answer, config.maxVerifyAttempts);
    store.addLog(message.author.id, 'muted');

    // 8. Send notification and verification question via DM
    const dmEmbed = new EmbedBuilder()
      .setTitle('🚨 Güvenlik Bildirimi: Hesabınız Susturuldu (Muted)')
      .setDescription(
        'Sunucumuzdaki tuzak (**honeypot**) kanalına mesaj gönderdiğiniz tespit edildi.\n' +
        'Olası hesap çalınması ve spam yayılmasını önlemek amacıyla hesabınız **süresiz olarak susturulmuş** ' +
        `ve son ${config.deleteWindowHours} saatteki mesajlarınız temizlenmiştir.\n\n` +
        'Hesabınız sizin kontrolünüzdeyse susturmayı otomatik kaldırmak için aşağıdaki soruyu cevaplayın:'
      )
      .setColor(0xE74C3C)
      .addFields(
        {
          name: '❓ Doğrulama Sorusu',
          value: `👉 **${question} = ?**`,
          inline: false
        },
        {
          name: '💬 Nasıl Cevaplayabilirsiniz?',
          value: 
            '• **1. Yol:** Bu DM kutusuna doğrudan cevabı sayı olarak yazıp gönderin (Örn: `11`).\n' +
            '• **2. Yol:** Aşağıdaki **"Cevapla"** butonuna tıklayarak açılan kutuya yazın.\n' +
            '• **3. Yol:** Sunucuda veya burada `/verify` komutunu kullanın (Örn: `/verify answer:11`).',
          inline: false
        }
      )
      .setFooter({ text: `Maksimum ${config.maxVerifyAttempts} yanlış deneme hakkınız bulunmaktadır • By Zywexx & 787 INC` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_verify_modal')
        .setLabel('Cevapla')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔢')
    );

    let dmSent = false;
    try {
      await message.author.send({
        embeds: [dmEmbed],
        components: [row]
      });
      dmSent = true;
    } catch (dmErr) {
      console.warn(`[Honeypot] Could not send DM to ${message.author.tag} (${message.author.id}):`, dmErr.message);
      store.addLog(message.author.id, 'dm_failed');
      await logAction(message.guild, message.author.id, 'dm_failed', {
        reason: 'Kullanıcının DM kutusu kapalı. Sunucudaki açık bir kanaldan /verify komutuyla doğrulama yapabilir.'
      });
    }

    // 9. Send log embed to log channel
    await logAction(message.guild, message.author.id, 'muted', {
      deletedCount,
      reason: `Honeypot kanalına mesaj gönderildi. DM Bildirimi: ${dmSent ? 'Gönderildi' : 'Başarısız (DM Kapalı)'}`
    });

    // 10. Update warning message counter in honeypot channel
    await updateWarningMessage(message.client);
  }
};
