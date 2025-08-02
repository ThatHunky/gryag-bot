const config = require("../../../config/bot");
const geminiService = require("../services/gemini");
const languageService = require("../services/language");
const botStateService = require("../services/botState");
const throttleService = require("../services/throttle");
const databaseService = require("../services/database");
const embeddingService = require("../services/embedding");
const searchService = require("../services/search");

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

  // 🔍 КОМАНДА ПОШУКУ
  static async search(msg, bot) {
    // Skip old messages to prevent startup spam
    if (this.isOldMessage(msg)) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const chatType = msg.chat.type;

    // перевіряємо чи бот має відповідати
    if (!botStateService.shouldRespond(userId)) {
      const statusMessage = botStateService.getStatusMessage(
        userId,
        languageService
      );
      return await bot.sendMessage(chatId, statusMessage, {
        parse_mode: "HTML",
      });
    }

    // throttle check для не-адмінів
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

      // Додаткова перевірка для пошукових запитів (3 на годину)
      const searchCheck = throttleService.canMakeSearchQuery(userId);
      if (!searchCheck.allowed) {
        // Тихо ігноруємо перевищення ліміту пошуку - не відправляємо повідомлення
        console.log(
          `🔍 Search throttled for user ${userId}: reached 3 queries per hour limit`
        );
        return;
      }
    }

    const query = msg.text.replace("/search", "").replace("/пошук", "").trim();
    if (!query) {
      const helpText = languageService.getText(userId, "searchHelp");
      return await bot.sendMessage(chatId, helpText, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
      });
    }

    const searchingText = languageService.getText(userId, "searching");
    const searchingMsg = await bot.sendMessage(chatId, searchingText, {
      reply_to_message_id: msg.message_id,
    });

    try {
      await bot.sendChatAction(chatId, "typing");

      const results = await searchService.searchWeb(query);

      if (!results || results.length === 0) {
        const noResultsText = languageService.getText(
          userId,
          "noSearchResults"
        );
        return await bot.editMessageText(noResultsText, {
          chat_id: chatId,
          message_id: searchingMsg.message_id,
        });
      }

      const resultsText = this.formatSearchResults(results, userId, query);
      await bot.editMessageText(resultsText, {
        chat_id: chatId,
        message_id: searchingMsg.message_id,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      });
    } catch (error) {
      console.error("❌ search command error:", error);
      const errorText = languageService.getText(userId, "searchError");
      await bot.editMessageText(errorText, {
        chat_id: chatId,
        message_id: searchingMsg.message_id,
      });
    }
  }

  // ✅ КОМАНДА ФАКТЧЕКІНГУ
  static async factcheck(msg, bot) {
    // Skip old messages to prevent startup spam
    if (this.isOldMessage(msg)) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const chatType = msg.chat.type;

    // перевіряємо чи бот має відповідати
    if (!botStateService.shouldRespond(userId)) {
      const statusMessage = botStateService.getStatusMessage(
        userId,
        languageService
      );
      return await bot.sendMessage(chatId, statusMessage, {
        parse_mode: "HTML",
      });
    }

    // throttle check для не-адмінів
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

      // Додаткова перевірка для пошукових запитів (3 на годину)
      const searchCheck = throttleService.canMakeSearchQuery(userId);
      if (!searchCheck.allowed) {
        // Тихо ігноруємо перевищення ліміту пошуку - не відправляємо повідомлення
        console.log(
          `🔍 Factcheck throttled for user ${userId}: reached 3 queries per hour limit`
        );
        return;
      }
    }

    const query = msg.text
      .replace("/factcheck", "")
      .replace("/фактчек", "")
      .trim();
    if (!query) {
      const helpText = languageService.getText(userId, "factcheckHelp");
      return await bot.sendMessage(chatId, helpText, {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
      });
    }

    const checkingText = languageService.getText(userId, "factchecking");
    const checkingMsg = await bot.sendMessage(chatId, checkingText, {
      reply_to_message_id: msg.message_id,
    });

    try {
      await bot.sendChatAction(chatId, "typing");

      // отримуємо результати фактчекінгу
      const searchResults = await searchService.factCheck(query);

      // генеруємо відповідь через gemini з результатами пошуку
      const context = {
        chatId,
        userId,
        text: `фактчек: ${query}`,
        isReply: false,
        searchResults: searchResults, // передаємо результати пошуку
      };

      const response = await geminiService.generateResponseWithSearch(context);

      await bot.editMessageText(response, {
        chat_id: chatId,
        message_id: checkingMsg.message_id,
        parse_mode: "HTML",
      });
    } catch (error) {
      console.error("❌ factcheck error:", error);
      const errorText = languageService.getText(userId, "factcheckError");
      await bot.editMessageText(errorText, {
        chat_id: chatId,
        message_id: checkingMsg.message_id,
      });
    }
  }

  // 📰 КОМАНДА НОВИН
  static async news(msg, bot) {
    // Skip old messages to prevent startup spam
    if (this.isOldMessage(msg)) return;

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const chatType = msg.chat.type;

    // перевіряємо чи бот має відповідати
    if (!botStateService.shouldRespond(userId)) {
      const statusMessage = botStateService.getStatusMessage(
        userId,
        languageService
      );
      return await bot.sendMessage(chatId, statusMessage, {
        parse_mode: "HTML",
      });
    }

    // throttle check для не-адмінів
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

      // Додаткова перевірка для пошукових запитів (3 на годину)
      const searchCheck = throttleService.canMakeSearchQuery(userId);
      if (!searchCheck.allowed) {
        // Тихо ігноруємо перевищення ліміту пошуку - не відправляємо повідомлення
        console.log(
          `📰 News throttled for user ${userId}: reached 3 queries per hour limit`
        );
        return;
      }
    }

    const topic =
      msg.text.replace("/news", "").replace("/новини", "").trim() ||
      "україна новини";

    const loadingText = languageService.getText(userId, "loadingNews");
    const loadingMsg = await bot.sendMessage(chatId, loadingText, {
      reply_to_message_id: msg.message_id,
    });

    try {
      await bot.sendChatAction(chatId, "typing");

      const newsResults = await searchService.getNewsUpdate(topic);

      if (!newsResults || newsResults.length === 0) {
        const noNewsText = languageService.getText(userId, "noNewsFound");
        return await bot.editMessageText(noNewsText, {
          chat_id: chatId,
          message_id: loadingMsg.message_id,
        });
      }

      const newsText = this.formatNewsResults(newsResults, userId, topic);
      await bot.editMessageText(newsText, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      });
    } catch (error) {
      console.error("❌ news command error:", error);
      const errorText = languageService.getText(userId, "newsError");
      await bot.editMessageText(errorText, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
      });
    }
  }

  // 🔧 ДОПОМІЖНІ МЕТОДИ ДЛЯ ФОРМАТУВАННЯ

  static formatSearchResults(results, userId, query) {
    const header = languageService.getText(userId, "searchResults", query);

    const formattedResults = results
      .map((result, index) => {
        let emoji = "🔍";
        if (result.type === "answer") emoji = "💡";
        else if (result.type === "definition") emoji = "📖";
        else if (result.type === "abstract") emoji = "ℹ️";
        else if (result.type === "related") emoji = "🔗";

        let formatted = `${emoji} <b>${result.title}</b>\n`;
        formatted += `${result.snippet}\n`;

        if (result.link && result.link !== "#") {
          formatted += `🌐 <a href="${result.link}">${result.displayLink}</a>`;
        }

        return formatted;
      })
      .join("\n\n");

    return `${header}\n\n${formattedResults}`;
  }

  static formatNewsResults(results, userId, topic) {
    const header = languageService.getText(userId, "newsResults", topic);

    const formattedResults = results
      .slice(0, 5)
      .map((result, index) => {
        return `📰 <b>${result.title}</b>\n${result.snippet}`;
      })
      .join("\n\n");

    return `${header}\n\n${formattedResults}`;
  }
}

module.exports = CommandHandler;
