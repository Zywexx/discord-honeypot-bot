const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const config = require('./config');
const db = require('./utils/db');
const cleanOldRecords = require('./utils/cleanup');

// Validate environment configuration
try {
  config.validate(false);
} catch (err) {
  console.error(err.message);
  console.error('[Bot] Please update your .env file with valid credentials before starting.');
  process.exit(1);
}

// Create Discord Client with necessary Intents and Partials
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers
  ],
  partials: [
    Partials.Channel, // Crucial for Direct Message events in discord.js v14
    Partials.Message
  ]
});

client.commands = new Collection();

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`[Commands] Loaded slash command: /${command.data.name}`);
  } else {
    console.warn(`[Commands] The command at ${filePath} is missing required "data" or "execute" property.`);
  }
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js') && !file.includes('.dm.'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`[Events] Registered event listener: ${event.name}`);
}

// Haftalık Veritabanı Temizliği Cron Job'ı
// Her Pazar gecesi saat 04:00'te çalışır ('0 4 * * 0')
cron.schedule('0 4 * * 0', () => {
  console.log('\n[Cron] Haftalık veritabanı temizleme görevi çalıştırılıyor...');
  try {
    cleanOldRecords(7);
  } catch (err) {
    console.error('[Cron Error] Otomatik temizlik sırasında hata oluştu:', err.message);
  }
});
console.log('[Cron] Haftalık otomatik veritabanı temizleme görevi zamanlandı (Her Pazar 04:00).');

// Graceful shutdown handling
function handleShutdown(signal) {
  console.log(`\n[Bot] Received ${signal}. Shutting down gracefully...`);
  try {
    db.close();
    console.log('[Database] SQLite connection closed.');
  } catch (dbErr) {
    console.error('[Database] Error closing SQLite database:', dbErr.message);
  }
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// Login to Discord
client.login(config.botToken).catch(err => {
  console.error('[Bot Error] Failed to login to Discord:', err.message);
  process.exit(1);
});
