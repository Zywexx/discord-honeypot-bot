const db = require('./db');

/**
 * 7 günden eski gereksiz kayıtları (logs ve doğrulanmış/tamamlanmış mute geçmişini) temizler.
 * 
 * Güvenlik Kuralları:
 * - 'bot_state' tablosuna ASLA dokunmaz.
 * - 'muted_users' tablosunda 'status = pending' olan aktif mütelere ASLA dokunmaz.
 * - 'verification_attempts' satırları foreign key ON DELETE CASCADE sayesinde otomatik silinir.
 * 
 * @param {number} days - Kaç günden eski kayıtların silineceği (varsayılan: 7)
 * @returns {{ deletedLogs: number, deletedMutedUsers: number }}
 */
function cleanOldRecords(days = 7) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // better-sqlite3 senkron prepared statements
  const deleteLogsStmt = db.prepare(`
    DELETE FROM logs
    WHERE timestamp < ?
  `);

  const deleteMutedUsersStmt = db.prepare(`
    DELETE FROM muted_users
    WHERE status != 'pending' AND muted_at < ?
  `);

  // İki silme işlemini atomik olarak transaction içinde çalıştır
  const runCleanupTransaction = db.transaction((cutoff) => {
    // 1. 7 günden eski audit loglarını sil
    const logsResult = deleteLogsStmt.run(cutoff);

    // 2. 7 günden eski ve 'pending' olmayan (tamamlanmış/geçmiş) mute kayıtlarını sil
    // (verification_attempts tablosundaki ilişkili satırlar CASCADE ile otomatik silinir)
    const mutedUsersResult = deleteMutedUsersStmt.run(cutoff);

    return {
      deletedLogs: logsResult.changes,
      deletedMutedUsers: mutedUsersResult.changes
    };
  });

  try {
    const { deletedLogs, deletedMutedUsers } = runCleanupTransaction(cutoffDate);

    console.log(`[Database Cleanup] Temizlik tamamlandı (${days} günden eski kayıtlar):`);
    console.log(` • Silinen log kaydı: ${deletedLogs}`);
    console.log(` • Silinen geçmiş mute kaydı: ${deletedMutedUsers}`);

    return { deletedLogs, deletedMutedUsers };
  } catch (error) {
    console.error('[Database Cleanup Error] Temizlik sırasında hata oluştu:', error.message);
    throw error;
  }
}

// Dosya doğrudan terminalden çalıştırıldığında (node src/utils/cleanup.js) tek seferlik temizlik yapar
if (require.main === module) {
  console.log('[Database Cleanup] Manuel temizlik başlatılıyor...');
  cleanOldRecords();
}

module.exports = cleanOldRecords;
