const { Events, ActivityType } = require('discord.js');
const initDb = require('../utils/initDb');
const { updateWarningMessage } = require('../utils/warningMessage');
const config = require('../config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  /**
   * @param {import('discord.js').Client} client 
   */
  async execute(client) {
    console.log(`[Bot] Logged in successfully as ${client.user.tag} (ID: ${client.user.id})`);
    console.log('[Bot] 🛡️ Honeypot Security System • By Zywexx & 787 INC');

    // Bot durumu (Presence) ayarla
    client.user.setPresence({
      activities: [{
        name: '🛡️ Honeypot • By Zywexx & 787 INC',
        type: ActivityType.Custom
      }],
      status: 'online'
    });

    // Initialize SQLite database schema
    initDb();

    // Verify guild access
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) {
      console.warn(`[Bot Warning] Bot is not in the configured GUILD_ID (${config.guildId}). Make sure to invite the bot to the server!`);
    } else {
      console.log(`[Bot] Active in guild: ${guild.name} (${guild.id})`);

      // Check muted role
      if (config.mutedRoleId) {
        const mutedRole = guild.roles.cache.get(config.mutedRoleId);
        if (!mutedRole) {
          console.warn(`[Bot Warning] MUTED_ROLE_ID (${config.mutedRoleId}) was not found in guild '${guild.name}'.`);
        } else {
          // Check role hierarchy
          const botMember = guild.members.me;
          if (botMember && botMember.roles.highest.position <= mutedRole.position) {
            console.warn(`[Bot Warning] Bot's highest role is lower than or equal to the Muted Role (${mutedRole.name}). The bot will NOT be able to assign or remove this role until you move the bot's role above the Muted role!`);
          }
        }
      }
    }

    // Set up or update the persistent honeypot warning message
    await updateWarningMessage(client);

    console.log('[Bot] Ready and listening for events.');
  }
};
