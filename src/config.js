const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const config = {
  botToken: process.env.BOT_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',
  honeypotChannelId: process.env.HONEYPOT_CHANNEL_ID || '',
  logChannelId: process.env.LOG_CHANNEL_ID || '',
  mutedRoleId: process.env.MUTED_ROLE_ID || '',
  exemptRoleIds: (process.env.EXEMPT_ROLE_IDS || '')
    .split(',')
    .map(roleId => roleId.trim())
    .filter(Boolean),
  deleteWindowHours: parseInt(process.env.MESSAGE_DELETE_WINDOW_HOURS || '24', 10),
  maxVerifyAttempts: parseInt(process.env.MAX_VERIFY_ATTEMPTS || '3', 10),

  /**
   * Validates required configuration keys.
   * @param {boolean} isDeploy - If true, only checks deploy-related keys.
   */
  validate(isDeploy = false) {
    const required = isDeploy
      ? ['BOT_TOKEN', 'CLIENT_ID']
      : ['BOT_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'HONEYPOT_CHANNEL_ID', 'LOG_CHANNEL_ID'];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`[Config Error] Missing required environment variables: ${missing.join(', ')}`);
    }

    if (!process.env.MUTED_ROLE_ID) {
      console.warn('[Config Warning] MUTED_ROLE_ID is currently empty in .env. You can run /mute-rol-olustur in your server to automatically create the role and configure channel permissions.');
    }
  },

  /**
   * Updates MUTED_ROLE_ID both in memory and persistently in the .env file.
   * @param {string} roleId 
   */
  setMutedRoleId(roleId) {
    config.mutedRoleId = roleId;
    process.env.MUTED_ROLE_ID = roleId;

    const envPath = path.resolve(__dirname, '../.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const regex = /^MUTED_ROLE_ID=.*$/m;
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `MUTED_ROLE_ID=${roleId}`);
    } else {
      envContent += `\nMUTED_ROLE_ID=${roleId}\n`;
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`[Config] Saved MUTED_ROLE_ID=${roleId} to .env file.`);
  }
};

module.exports = config;
