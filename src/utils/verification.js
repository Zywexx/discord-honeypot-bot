const store = require('./store');
const config = require('../config');
const { logAction } = require('./logger');

/**
 * Generates a friendly, basic math question and answer.
 * @returns {{ question: string, answer: number }}
 */
function generateQuestion() {
  const operations = ['+', '-', '*'];
  const op = operations[Math.floor(Math.random() * operations.length)];

  let a, b, answer;
  if (op === '+') {
    a = Math.floor(Math.random() * 15) + 3;
    b = Math.floor(Math.random() * 15) + 2;
    answer = a + b;
  } else if (op === '-') {
    a = Math.floor(Math.random() * 15) + 10;
    b = Math.floor(Math.random() * 9) + 1;
    answer = a - b;
  } else {
    // Multiplication with small numbers
    a = Math.floor(Math.random() * 8) + 2;
    b = Math.floor(Math.random() * 6) + 2;
    answer = a * b;
  }

  return {
    question: `${a} ${op} ${b}`,
    answer
  };
}

/**
 * Central verification check logic used across DM messages, slash command /verify, and modal interactions.
 * 
 * @param {import('discord.js').Guild} guild 
 * @param {string} userId 
 * @param {string|number} submittedAnswerInput 
 * @returns {Promise<{ success: boolean, reason?: string, remainingAttempts?: number, message: string }>}
 */
async function checkAnswer(guild, userId, submittedAnswerInput) {
  const parsedAnswer = parseInt(String(submittedAnswerInput).trim(), 10);
  if (isNaN(parsedAnswer)) {
    return {
      success: false,
      reason: 'INVALID_FORMAT',
      message: '❌ Lütfen cevabınızı sadece bir tam sayı olarak girin (Örnek: `12`).'
    };
  }

  const pendingMute = store.getPendingMuteByUserId(userId);
  if (!pendingMute) {
    return {
      success: false,
      reason: 'NO_PENDING_MUTE',
      message: 'ℹ️ Şu anda sizin için aktif veya bekleyen bir doğrulama işlemi bulunmuyor.'
    };
  }

  const verification = store.getLatestVerificationForMute(pendingMute.id);
  if (!verification) {
    return {
      success: false,
      reason: 'NO_VERIFICATION',
      message: '❌ Doğrulama kaydınıza ulaşılamadı. Lütfen sunucu yetkilileriyle iletişime geçin.'
    };
  }

  if (parsedAnswer === verification.correct_answer) {
    // Success: Remove muted role
    if (guild) {
      try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member && config.mutedRoleId) {
          await member.roles.remove(config.mutedRoleId);
        }
      } catch (roleErr) {
        console.error(`[Verification] Failed to remove muted role from user ${userId}:`, roleErr.message);
      }
    }

    store.markVerified(pendingMute.id);
    store.addLog(userId, 'verified');

    if (guild) {
      await logAction(guild, userId, 'verified', {
        reason: 'Doğrulama sorusu doğru cevaplandı.'
      });
    }

    return {
      success: true,
      message: '✅ **Doğrulama Başarılı!**\nSusturmanız (mute) kaldırıldı. Artık sunucuda tekrar mesaj yazabilirsiniz.'
    };
  } else {
    // Wrong answer
    store.incrementVerificationAttempt(verification.id);
    const attemptsUsed = verification.attempts_used + 1;

    if (attemptsUsed >= verification.max_attempts) {
      store.updateMuteStatus(pendingMute.id, 'max_attempts_reached');
      store.addLog(userId, 'max_attempts_reached');

      if (guild) {
        await logAction(guild, userId, 'max_attempts_reached', {
          reason: `Maksimum deneme hakkı (${verification.max_attempts}) aşıldı.`
        });
      }

      return {
        success: false,
        reason: 'MAX_ATTEMPTS_REACHED',
        message: `🛑 **Maksimum Deneme Hakkı Aşıldı!**\nHatalı cevap verdiniz ve tüm haklarınızı (${verification.max_attempts}/${verification.max_attempts}) doldurdunuz.\nSusturmanızın kaldırılması için lütfen bir sunucu yöneticisi ile iletişime geçin.`
      };
    } else {
      const remaining = verification.max_attempts - attemptsUsed;
      return {
        success: false,
        reason: 'WRONG_ANSWER',
        remainingAttempts: remaining,
        question: verification.question,
        message: `❌ **Yanlış Cevap!**\nKalan deneme hakkınız: **${remaining}**.\nSoruyu tekrar yanıtlayın: **${verification.question} = ?**`
      };
    }
  }
}

module.exports = {
  generateQuestion,
  checkAnswer
};
