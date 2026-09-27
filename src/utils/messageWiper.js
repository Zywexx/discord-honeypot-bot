/**
 * Scans all accessible text channels and threads in the guild to delete messages
 * sent by the specified user within the last N hours.
 * 
 * @param {import('discord.js').Guild} guild 
 * @param {string} userId 
 * @param {number} hours 
 * @returns {Promise<number>} Total number of deleted messages
 */
async function deleteRecentMessages(guild, userId, hours = 24) {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  let totalDeleted = 0;

  if (!guild) return totalDeleted;

  // Fetch or get all text-based channels and threads
  const channels = guild.channels.cache.filter(c => c.isTextBased() && !c.isDMBased());

  for (const channel of channels.values()) {
    try {
      let before = undefined;
      let keepFetching = true;
      let fetchCount = 0;
      const MAX_BATCHES = 10; // Up to 1,000 messages inspected per channel for safety

      while (keepFetching && fetchCount < MAX_BATCHES) {
        fetchCount++;
        const options = { limit: 100 };
        if (before) options.before = before;

        const messages = await channel.messages.fetch(options).catch(() => null);
        if (!messages || messages.size === 0) {
          keepFetching = false;
          break;
        }

        const toDelete = messages.filter(m => m.author.id === userId && m.createdTimestamp >= cutoff);

        if (toDelete.size > 0) {
          try {
            const deleted = await channel.bulkDelete(toDelete, true);
            totalDeleted += deleted.size;
          } catch (deleteErr) {
            console.warn(`[MessageWiper] Could not bulkDelete in channel ${channel.name} (${channel.id}):`, deleteErr.message);
          }
        }

        // Check the oldest message in this batch
        const oldestMessage = messages.last();
        if (!oldestMessage || oldestMessage.createdTimestamp < cutoff) {
          // We have reached beyond the 24h cutoff point in this channel
          keepFetching = false;
        } else {
          before = oldestMessage.id;
        }
      }
    } catch (channelErr) {
      // Missing permissions (View Channel, Manage Messages, Read Message History, etc.)
      // Safely ignore and continue with other channels
      console.warn(`[MessageWiper] Skipped channel ${channel.name} (${channel.id}) due to error:`, channelErr.message);
    }
  }

  return totalDeleted;
}

module.exports = {
  deleteRecentMessages
};
