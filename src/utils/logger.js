const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const ACTION_COLORS = {
  muted: 0xE74C3C, // Red
  verified: 0x2ECC71, // Green
  manual_unmute: 0x3498DB, // Blue
  dm_failed: 0xE67E22, // Orange
  max_attempts_reached: 0x992D22 // Dark Red
};

const ACTION_TITLES = {
  muted: '🚨 Honeypot Tetiklendi — Kullanıcı Susturuldu',
  verified: '✅ Doğrulama Başarılı — Mute Kaldırıldı',
  manual_unmute: '🛡️ Manuel Müdahale — Mute Kaldırıldı',
  dm_failed: '⚠️ DM Gönderilemedi',
  max_attempts_reached: '🛑 Maksimum Doğrulama Denemesi Aşıldı'
};

/**
 * Sends a structured log embed to the configured log channel.
 * @param {import('discord.js').Guild} guild 
 * @param {string} userId 
 * @param {string} action - 'muted' | 'verified' | 'manual_unmute' | 'dm_failed' | 'max_attempts_reached'
 * @param {object} [details]
 */
async function logAction(guild, userId, action, details = {}) {
  try {
    if (!guild) return;

    const logChannel = guild.channels.cache.get(config.logChannelId) || 
      await guild.channels.fetch(config.logChannelId).catch(() => null);

    if (!logChannel || !logChannel.isTextBased()) {
      console.warn(`[Logger] Log channel with ID ${config.logChannelId} could not be found or is not text-based.`);
      return;
    }

    const color = ACTION_COLORS[action] || 0x95A5A6;
    const title = ACTION_TITLES[action] || `İşlem: ${action}`;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: 'Honeypot Güvenlik Sistemi • By Zywexx & 787 INC' });

    embed.addFields({
      name: '👤 Kullanıcı',
      value: `<@${userId}> (\`${userId}\`)`,
      inline: true
    });

    if (details.deletedCount !== undefined) {
      embed.addFields({
        name: '🗑️ Silinen Mesaj Sayısı',
        value: `${details.deletedCount} adet (Son ${config.deleteWindowHours} saat)`,
        inline: true
      });
    }

    if (details.reason) {
      embed.addFields({
        name: '📌 Sebep / Detay',
        value: String(details.reason),
        inline: false
      });
    }

    if (details.adminId) {
      embed.addFields({
        name: '👮 Yetkili',
        value: `<@${details.adminId}>`,
        inline: true
      });
    }

    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[Logger] Failed to send log embed to channel:', err.message);
  }
}

module.exports = {
  logAction,
  ACTION_COLORS,
  ACTION_TITLES
};
