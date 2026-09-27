const config = require('../config');
const store = require('../utils/store');
const verification = require('../utils/verification');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Handles incoming Direct Messages sent to the bot.
 * @param {import('discord.js').Message} message 
 */
async function handleDmMessage(message) {
  const pendingMute = store.getPendingMuteByUserId(message.author.id);
  if (!pendingMute) {
    await message.reply('ℹ️ Şu anda sizin için bekleyen aktif bir doğrulama işlemi bulunmuyor.');
    return;
  }

  const guild = message.client.guilds.cache.get(config.guildId) ||
    await message.client.guilds.fetch(config.guildId).catch(() => null);

  const result = await verification.checkAnswer(guild, message.author.id, message.content.trim());

  if (result.success) {
    await message.reply({ content: result.message });
  } else {
    // If wrong answer and attempts remain, provide a response with the reply button
    if (result.remainingAttempts && result.remainingAttempts > 0) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('open_verify_modal')
          .setLabel('Tekrar Cevapla')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔢')
      );
      await message.reply({
        content: result.message,
        components: [row]
      });
    } else {
      await message.reply({ content: result.message });
    }
  }
}

module.exports = handleDmMessage;
