const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const config = require('../config');
const store = require('./store');

/**
 * Builds the Embed and ActionRow components for the honeypot channel warning message.
 * Specifically tailored to our bot's actual mechanisms (24h wipe, role mute, math verification).
 * 
 * @param {number} count 
 * @returns {{ content: string, embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildWarningPayload(count) {
  const embed = new EmbedBuilder()
    .setTitle('⛔ BU KANALA MESAJ YAZMAYIN')
    .setColor(0xED4245) // Discord Kırmızı / Uyarı
    .setDescription(
      'Bu kanal sunucumuzun **otomatik güvenlik tuzağıdır (Honeypot)**. Sohbet kanalı değildir.\n\n' +
      'Çalınan hesapların sunucuda spam veya zararlı link yaymasını engellemek amacıyla buraya mesaj atıldığında şu işlemler otomatik uygulanır:\n' +
      '• Gönderdiğin mesaj derhal silinir,\n' +
      `• Son **${config.deleteWindowHours} saat** içerisinde sunucudaki tüm kanallarda yazdığın mesajlar taranıp temizlenir,\n` +
      '• Hesabına güvenlik amacıyla süresiz **susturma (Mute)** rolü verilir.\n\n' +
      '🛡️ **Yanlışlıkla yazdıysan endişelenme!**\n' +
      'Sunucudan atılmaz veya yasaklanmazsın. Botumuz sana DM kutusu üzerinden basit bir matematik doğrulama sorusu gönderir.\n\n' +
      'Soruyu doğru yanıtladığında (DM\'den cevap yazarak, butona tıklayarak veya `/verify` komutuyla) **susturman anında kaldırılır**.\n\n' +
      '*⚠️ Merak edip test amaçlı mesaj göndermeyin; sistem tüm güvenlik ve temizlik adımlarını anında çalıştırır.*'
    )
    .setFooter({ text: 'Honeypot Güvenlik Sistemi • By Zywexx & 787 INC' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('honeypot_triggers_badge')
      .setEmoji('🧲')
      .setLabel(`Tetiklenmeler: ${count}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );

  return {
    content: '',
    embeds: [embed],
    components: [row]
  };
}

/**
 * Ensures or updates the warning message in the honeypot channel.
 * @param {import('discord.js').Client} client 
 */
async function updateWarningMessage(client) {
  try {
    if (!config.honeypotChannelId) return;

    const channel = client.channels.cache.get(config.honeypotChannelId) ||
      await client.channels.fetch(config.honeypotChannelId).catch(() => null);

    if (!channel || !channel.isTextBased()) {
      console.warn(`[WarningMessage] Honeypot channel (${config.honeypotChannelId}) not found or not text-based.`);
      return;
    }

    const count = store.countMutedUsers();
    const payload = buildWarningPayload(count);

    const messageId = store.getWarningMessageId();
    if (messageId) {
      try {
        const existingMessage = await channel.messages.fetch(messageId);
        if (existingMessage) {
          await existingMessage.edit(payload);
          return;
        }
      } catch (fetchErr) {
        // Message was deleted or cannot be fetched, we will post a new one below
        console.log('[WarningMessage] Stored warning message was not found on Discord, sending a new one.');
      }
    }

    // Send fresh embed message and store ID
    const newMessage = await channel.send(payload);
    store.setWarningMessageId(newMessage.id);
    console.log(`[WarningMessage] Warning message published with embed (ID: ${newMessage.id}).`);
  } catch (err) {
    console.error('[WarningMessage] Failed to set/update warning message:', err.message);
  }
}

module.exports = {
  updateWarningMessage,
  buildWarningPayload
};
