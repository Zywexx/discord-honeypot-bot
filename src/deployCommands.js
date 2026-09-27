const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

async function deploy() {
  try {
    config.validate(true);

    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`[Deploy] Loaded command for registration: /${command.data.name}`);
      } else {
        console.warn(`[Deploy] Warning: Command file at ${file} is missing 'data' or 'execute'.`);
      }
    }

    const rest = new REST().setToken(config.botToken);

    // 1. Register Global Application Commands (Enables commands to appear and work in DMs!)
    console.log(`[Deploy] Registering ${commands.length} application (/) commands globally...`);
    const globalData = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );
    console.log(`[Deploy] Successfully registered ${globalData.length} global commands (DM support active).`);

    // 2. Clear any old Guild-scoped commands to prevent duplicate command entries in the server
    if (config.guildId) {
      console.log(`[Deploy] Clearing old guild-specific commands for Guild ID: ${config.guildId} to avoid duplicates...`);
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: [] }
      );
      console.log('[Deploy] Guild-specific commands cleared.');
    }

    console.log('[Deploy] All commands successfully deployed and synchronized!');
  } catch (error) {
    console.error('[Deploy] Error deploying commands:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  deploy();
}

module.exports = deploy;
