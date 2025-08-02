const config = require("../../../config/bot");
const geminiService = require("../services/gemini");
const languageService = require("../services/language");
const botStateService = require("../services/botState");
const throttleService = require("../services/throttle");
const databaseService = require("../services/database");
const embeddingService = require("../services/embedding");

class CommandHandler {
  // Helper function to check if message is too old (prevents spam on startup)
  static isOldMessage(msg) {
    const messageAge = Date.now() / 1000 - msg.date;
    return messageAge > 30; // Ignore messages older than 30 seconds
  }

  static async start(msg, bot) {
    // Skip old messages to prevent startup spam
    if (this.isOldMessage(msg)) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name;
    const chatType = msg.chat.type;

    // Auto-detect language from user's first message
    if (msg.text) {
      languageService.autoDetectAndSetLanguage(userId, msg.text);
    }

    const welcomeMessage = languageService.getText(
      userId,
      "welcome",
      firstName,
      config.name
    );

    const keyboard = {
      inline_keyboard: [
        [{ text: "📋 Help / Допомога", callback_data: "help" }],
        [{ text: "⚙️ Settings / Налаштування", callback_data: "settings" }],
        [{ text: "🌐 Language / Мова", callback_data: "language" }],
      ],
    };

    // Додати кнопку адміна для адмінів
    if (botStateService.isAdmin(userId)) {
      keyboard.inline_keyboard.push([
        {
          text: "🔧 Admin Panel / Панель адміна",
          callback_data: "admin_panel",
        },
      ]);
    }

    await bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  static async help(msg, bot) {
    // Skip old messages to prevent startup spam
    if (this.isOldMessage(msg)) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const helpMessage = languageService.getText(
      userId,
      "help",
      config.username
    );

    await bot.sendMessage(chatId, helpMessage, { parse_mode: "HTML" });
  }

  static async settings(msg, bot) {
    // Skip old messages to prevent startup spam
    if (this.isOldMessage(msg)) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🔔 Notifications", callback_data: "settings_notifications" },
          { text: "🌐 Language / Мова", callback_data: "language" },
        ],
        [
          { text: "🎨 Theme", callback_data: "settings_theme" },
          { text: "🔒 Privacy", callback_data: "settings_privacy" },
        ],
        [{ text: "🔙 Back / Назад", callback_data: "main_menu" }],
      ],
    };

    const settingsMessage = languageService.getText(userId, "settings");
    await bot.sendMessage(chatId, settingsMessage, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  static async test(msg, bot) {
    // Skip old messages to prevent startup spam
    if (this.isOldMessage(msg)) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const chatType = msg.chat.type;

    // Check throttling for non-admin commands
    if (!botStateService.isAdmin(userId)) {
      const throttleCheck = throttleService.canProcessMessage(
        userId,
        chatId,
        chatType
      );
      if (!throttleCheck.allowed) {
        await this.handleThrottleResponse(
          throttleCheck,
          userId,
          chatId,
          bot,
          msg.message_id
        );
        return;
      }
    }

    const testingMessage = languageService.getText(userId, "testAI");
    await bot.sendMessage(chatId, testingMessage);

    const isWorking = await geminiService.testConnection();

    if (isWorking) {
      const successMessage = languageService.getText(userId, "testSuccess");
      await bot.sendMessage(chatId, successMessage);
    } else {
      const failedMessage = languageService.getText(userId, "testFailed");
      await bot.sendMessage(chatId, failedMessage);
    }
  }

  static async language(msg, bot) {
    // Skip old messages to prevent startup spam
    if (this.isOldMessage(msg)) return;

    const chatId = msg.chat.id;

    const languageMessage = languageService.getText(0, "chooseLanguage"); // Use neutral language
    const keyboard = languageService.getLanguageKeyboard();

    await bot.sendMessage(chatId, languageMessage, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  static async admin(msg, bot) {
    // Skip old messages to prevent startup spam
    if (this.isOldMessage(msg)) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Перевірити чи користувач є адміном
    if (!botStateService.isAdmin(userId)) {
      const notAdminMessage = languageService.getText(userId, "notAdmin");
      await bot.sendMessage(chatId, notAdminMessage);
      return;
    }

    // Показати панель адміністратора
    const adminMessage = languageService.getText(userId, "adminPanel");
    const statusMessage = botStateService.getStatusMessage(
      userId,
      languageService
    );
    const keyboard = botStateService.getAdminKeyboard(userId, languageService);

    await bot.sendMessage(chatId, `${adminMessage}\n\n${statusMessage}`, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  /**
   * Handle throttle responses with localized messages (shared with MessageHandler)
   * @param {Object} throttleResult - Result from throttle service
   * @param {number} userId - Telegram user ID
   * @param {number} chatId - Telegram chat ID
   * @param {Object} bot - Bot instance
   * @param {number} replyToMessageId - Message ID to reply to
   */
  static async handleThrottleResponse(
    throttleResult,
    userId,
    chatId,
    bot,
    replyToMessageId
  ) {
    let message;

    switch (throttleResult.reason) {
      case "user_cooldown":
        const timeLeft = throttleService.formatTimeLeft(
          throttleResult.timeLeft
        );
        message = languageService.getText(
          userId,
          "throttleUserCooldown",
          timeLeft
        );
        break;

      case "chat_cooldown":
        const chatTimeLeft = throttleService.formatTimeLeft(
          throttleResult.timeLeft
        );
        message = languageService.getText(
          userId,
          "throttleChatCooldown",
          chatTimeLeft
        );
        break;

      case "rate_limit":
        const resetTime = throttleService.formatTimeLeft(
          throttleResult.resetTime - Date.now()
        );
        message = languageService.getText(
          userId,
          "throttleRateLimit",
          resetTime
        );
        break;

      default:
        // Fallback message if reason is unknown
        message = languageService.getText(userId, "errorProcessing");
    }

    try {
      await bot.sendMessage(chatId, message, {
        parse_mode: "HTML",
        reply_to_message_id: replyToMessageId,
      });
    } catch (error) {
      console.error("Error sending throttle response:", error);
    }
  }

  // 📊 КОМАНДА СТАТИСТИКИ БАЗИ ДАНИХ
  static async stats(msg, bot) {
    // Skip old messages to prevent startup spam
    if (this.isOldMessage(msg)) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const chatType = msg.chat.type;

    // Перевірити чи бот має відповідати
    if (!botStateService.shouldRespond(userId)) {
      const statusMessage = botStateService.getStatusMessage(
        userId,
        languageService
      );
      return await bot.sendMessage(chatId, statusMessage, {
        parse_mode: "HTML",
      });
    }

    // Check throttling for non-admin users
    if (!botStateService.isAdmin(userId)) {
      const throttleCheck = throttleService.canProcessMessage(
        userId,
        chatId,
        chatType
      );
      if (!throttleCheck.allowed) {
        await this.handleThrottleResponse(
          throttleCheck,
          userId,
          chatId,
          bot,
          msg.message_id
        );
        return;
      }
    }

    try {
      // Show typing indicator
      await bot.sendChatAction(chatId, "typing");

      // Get statistics
      const chatStats = await databaseService.getChatStats(chatId);
      const cacheStats = embeddingService.getCacheStats();

      let statsMessage = "📊 <b>Статистика бази даних</b>\n\n";

      if (chatStats) {
        statsMessage += `💬 <b>Цей чат:</b>\n`;
        statsMessage += `📝 Всього повідомлень: ${chatStats.total_messages}\n`;
        statsMessage += `🧠 З embeddings: ${chatStats.messages_with_embeddings}\n`;
        statsMessage += `👥 Унікальних користувачів: ${chatStats.unique_users}\n`;

        if (chatStats.first_message_time) {
          const firstMsg = new Date(chatStats.first_message_time);
          statsMessage += `📅 Перше повідомлення: ${firstMsg.toLocaleDateString("uk-UA")}\n`;
        }

        if (chatStats.last_message_time) {
          const lastMsg = new Date(chatStats.last_message_time);
          statsMessage += `⏰ Останнє повідомлення: ${lastMsg.toLocaleDateString("uk-UA")}\n`;
        }
      } else {
        statsMessage += `💬 <b>Цей чат:</b>\n📝 Повідомлень поки немає в базі даних\n`;
      }

      statsMessage += `\n🧠 <b>Кеш embeddings:</b>\n`;
      statsMessage += `📦 Використано: ${cacheStats.usage}\n`;
      statsMessage += `🔢 Записів: ${cacheStats.size}/${cacheStats.maxSize}\n`;

      // Тільки для адмінів - додаткова інформація
      if (botStateService.isAdmin(userId)) {
        statsMessage += `\n🔧 <b>Для адміна:</b>\n`;
        statsMessage += `💾 Автоматичне збереження: ✅ Увімкнено\n`;
        statsMessage += `🔍 Семантичний пошук: ✅ Увімкнено\n`;
        statsMessage += `🎯 Модель embeddings: text-embedding-004\n`;
      }

      await bot.sendMessage(chatId, statsMessage, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
      });
    } catch (error) {
      console.error("Error in stats command:", error);
      const errorMessage = languageService.getText(userId, "errorProcessing");
      await bot.sendMessage(chatId, errorMessage, {
        reply_to_message_id: msg.message_id,
      });
    }
  }
}

module.exports = CommandHandler;
