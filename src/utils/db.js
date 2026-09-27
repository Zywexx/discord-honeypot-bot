const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'honeypot.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and durability
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
