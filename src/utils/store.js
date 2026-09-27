const db = require('./db');

// Prepared statements for maximum performance
const stmts = {
  insertMute: db.prepare(`
    INSERT INTO muted_users (user_id, muted_at, reason, messages_deleted_count, status)
    VALUES (?, ?, 'honeypot_trigger', ?, 'pending')
  `),

  insertVerification: db.prepare(`
    INSERT INTO verification_attempts (muted_user_id, question, correct_answer, attempts_used, max_attempts, created_at)
    VALUES (?, ?, ?, 0, ?, ?)
  `),

  getPendingMuteByUserId: db.prepare(`
    SELECT * FROM muted_users
    WHERE user_id = ? AND status = 'pending'
    ORDER BY id DESC
    LIMIT 1
  `),

  getLatestVerificationForMute: db.prepare(`
    SELECT * FROM verification_attempts
    WHERE muted_user_id = ?
    ORDER BY id DESC
    LIMIT 1
  `),

  incrementVerificationAttempt: db.prepare(`
    UPDATE verification_attempts
    SET attempts_used = attempts_used + 1
    WHERE id = ?
  `),

  markVerified: db.prepare(`
    UPDATE muted_users
    SET status = 'verified'
    WHERE id = ?
  `),

  updateMuteStatus: db.prepare(`
    UPDATE muted_users
    SET status = ?
    WHERE id = ?
  `),

  addLog: db.prepare(`
    INSERT INTO logs (user_id, action, timestamp)
    VALUES (?, ?, ?)
  `),

  countMutedUsers: db.prepare(`
    SELECT COUNT(*) as count FROM muted_users
  `),

  getWarningMessageId: db.prepare(`
    SELECT value FROM bot_state WHERE key = 'warning_message_id'
  `),

  setWarningMessageId: db.prepare(`
    INSERT INTO bot_state (key, value)
    VALUES ('warning_message_id', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `)
};

const store = {
  insertMute(userId, messagesDeletedCount = 0) {
    const info = stmts.insertMute.run(userId, new Date().toISOString(), messagesDeletedCount);
    return info.lastInsertRowid;
  },

  insertVerification(mutedUserId, question, correctAnswer, maxAttempts = 3) {
    const info = stmts.insertVerification.run(
      mutedUserId,
      question,
      correctAnswer,
      maxAttempts,
      new Date().toISOString()
    );
    return info.lastInsertRowid;
  },

  getPendingMuteByUserId(userId) {
    return stmts.getPendingMuteByUserId.get(userId);
  },

  getLatestVerificationForMute(mutedUserId) {
    return stmts.getLatestVerificationForMute.get(mutedUserId);
  },

  incrementVerificationAttempt(verificationId) {
    stmts.incrementVerificationAttempt.run(verificationId);
  },

  markVerified(mutedUserId) {
    stmts.markVerified.run(mutedUserId);
  },

  updateMuteStatus(mutedUserId, status) {
    stmts.updateMuteStatus.run(status, mutedUserId);
  },

  addLog(userId, action) {
    stmts.addLog.run(userId, action, new Date().toISOString());
  },

  countMutedUsers() {
    const row = stmts.countMutedUsers.get();
    return row ? row.count : 0;
  },

  getWarningMessageId() {
    const row = stmts.getWarningMessageId.get();
    return row ? row.value : null;
  },

  setWarningMessageId(messageId) {
    stmts.setWarningMessageId.run(messageId);
  }
};

module.exports = store;
