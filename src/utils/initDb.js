const db = require('./db');

function initDb() {
  const schema = `
    CREATE TABLE IF NOT EXISTS bot_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS muted_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      muted_at TEXT NOT NULL,
      reason TEXT DEFAULT 'honeypot_trigger',
      messages_deleted_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS verification_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      muted_user_id INTEGER NOT NULL REFERENCES muted_users(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      correct_answer INTEGER NOT NULL,
      attempts_used INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 3,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_muted_users_user_id_status ON muted_users(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_verification_muted_user_id ON verification_attempts(muted_user_id);
    CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
  `;

  db.exec(schema);
  console.log('[Database] Tables and indexes initialized successfully.');
}

module.exports = initDb;
