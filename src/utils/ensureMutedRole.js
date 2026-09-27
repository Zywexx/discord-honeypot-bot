const { PermissionsBitField } = require('discord.js');
const config = require('../config');

/**
 * Checks if the muted role exists in the guild. If not, can create it and configure
 * channel permission overwrites across the server so muted users cannot speak, react, or post.
 * 
 * @param {import('discord.js').Guild} guild 
 * @returns {Promise<import('discord.js').Role>}
 */
async function ensureMutedRole(guild) {
  if (!guild) throw new Error('Guild is required');

  let mutedRole = null;
  if (config.mutedRoleId) {
    mutedRole = guild.roles.cache.get(config.mutedRoleId) ||
      await guild.roles.fetch(config.mutedRoleId).catch(() => null);
  }

  if (!mutedRole) {
    console.log('[Setup] MUTED_ROLE_ID not found or not provided. Creating a new "Honeypot Muted" role...');
    mutedRole = await guild.roles.create({
      name: 'Honeypot Muted',
      color: 0x7F8C8D,
      permissions: [],
      reason: 'Automated role created for honeypot muting'
    });
    console.log(`[Setup] Created "Honeypot Muted" role with ID: ${mutedRole.id}. Please update MUTED_ROLE_ID in your .env!`);
  }

  // Configure permissions across text and voice channels
  const channels = guild.channels.cache;
  for (const channel of channels.values()) {
    try {
      if (channel.isTextBased()) {
        await channel.permissionOverwrites.edit(mutedRole, {
          SendMessages: false,
          AddReactions: false,
          CreatePublicThreads: false,
          CreatePrivateThreads: false,
          SendMessagesInThreads: false
        });
      } else if (channel.isVoiceBased()) {
        await channel.permissionOverwrites.edit(mutedRole, {
          Speak: false,
          SendMessages: false,
          AddReactions: false
        });
      }
    } catch (err) {
      console.warn(`[Setup] Could not set permission overrides for channel ${channel.name}:`, err.message);
    }
  }

  console.log('[Setup] Muted role channel permission overrides updated successfully.');
  return mutedRole;
}

module.exports = {
  ensureMutedRole
};
