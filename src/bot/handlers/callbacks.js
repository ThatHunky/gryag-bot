const languageService = require("../services/language");
const config = require("../../../config/bot");
const botStateService = require("../services/botState");
const throttleService = require("../services/throttle");

class CallbackHandler {
  static async handleCallback(query, bot) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const userId = query.from.id;
    const data = query.data;

    // Answer the callback query to remove loading state
    await bot.answerCallbackQuery(query.id);

    // Handle language selection
    if (data.startsWith("lang_")) {
      const language = data.replace("lang_", "");
      languageService.setUserLanguage(userId, language);
      const langName = languageService.languages[language].name;
      const successMessage = languageService.getText(
        userId,
        "languageChanged",
        langName
      );

      await bot.answerCallbackQuery(query.id, {
        text: successMessage,
        show_alert: true,
      });

      // Update the message to show main menu in new language
      await this.showMainMenu(chatId, messageId, bot, userId);
      return;
    }

    // Handle admin actions
    if (data.startsWith("admin_")) {
      if (!botStateService.isAdmin(userId)) {
        const notAdminMessage = languageService.getText(userId, "notAdmin");
        await bot.answerCallbackQuery(query.id, {
          text: notAdminMessage,
          show_alert: true,
        });
        return;
      }

      switch (data) {
        case "admin_panel":
          await this.showAdminPanel(chatId, messageId, bot, userId);
          break;
        case "admin_toggle_bot":
          await this.toggleBot(chatId, messageId, bot, userId, query.id);
          break;
        case "admin_status":
          await this.showAdminPanel(chatId, messageId, bot, userId);
          break;
        case "admin_throttle_stats":
          await this.showThrottleStats(chatId, messageId, bot, userId);
          break;
        case "admin_throttle_reset":
          await this.showThrottleResetMenu(chatId, messageId, bot, userId);
          break;
        case "admin_throttle_reset_user":
          await this.resetUserThrottle(
            chatId,
            messageId,
            bot,
            userId,
            query.id
          );
          break;
        case "admin_throttle_reset_all":
          await this.resetAllThrottle(chatId, messageId, bot, userId, query.id);
          break;
      }
      return;
    }

    switch (data) {
      case "help":
        await this.showHelp(chatId, messageId, bot, userId);
        break;
      case "settings":
        await this.showSettings(chatId, messageId, bot, userId);
        break;
      case "language":
        await this.showLanguageSettings(chatId, messageId, bot);
        break;
      case "admin_panel":
        if (botStateService.isAdmin(userId)) {
          await this.showAdminPanel(chatId, messageId, bot, userId);
        }
        break;
      case "settings_notifications":
        await this.showNotificationSettings(chatId, messageId, bot, userId);
        break;
      case "main_menu":
        await this.showMainMenu(chatId, messageId, bot, userId);
        break;
      default:
        const unknownMessage = languageService.getText(
          userId,
          "unsupportedMessage"
        );
        await bot.sendMessage(chatId, unknownMessage);
    }
  }

  static async showHelp(chatId, messageId, bot, userId) {
    const helpMessage = languageService.getText(
      userId,
      "help",
      config.username
    );

    const backText =
      languageService.getUserLanguage(userId) === "uk"
        ? "🔙 Назад до меню"
        : "🔙 Back to Menu";
    const keyboard = {
      inline_keyboard: [[{ text: backText, callback_data: "main_menu" }]],
    };

    await bot.editMessageText(helpMessage, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  static async showSettings(chatId, messageId, bot, userId) {
    const settingsMessage = languageService.getText(userId, "settings");
    const userLang = languageService.getUserLanguage(userId);

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🔔 Notifications", callback_data: "settings_notifications" },
          { text: "🌐 Language / Мова", callback_data: "language" },
        ],
        [
          {
            text: userLang === "uk" ? "🔙 Назад" : "🔙 Back",
            callback_data: "main_menu",
          },
        ],
      ],
    };

    await bot.editMessageText(settingsMessage, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  static async showLanguageSettings(chatId, messageId, bot) {
    const languageMessage = languageService.getText(0, "chooseLanguage"); // Use neutral
    const keyboard = languageService.getLanguageKeyboard();

    await bot.editMessageText(languageMessage, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  static async showNotificationSettings(chatId, messageId, bot, userId) {
    const userLang = languageService.getUserLanguage(userId);
    const message =
      userLang === "uk"
        ? "🔔 <b>Налаштування сповіщень</b>\n\nНезабаром!"
        : "🔔 <b>Notification Settings</b>\n\nComing soon!";

    const backText = userLang === "uk" ? "🔙 Назад" : "🔙 Back";

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: backText, callback_data: "settings" }]],
      },
      parse_mode: "HTML",
    });
  }

  static async showMainMenu(chatId, messageId, bot, userId) {
    const userLang = languageService.getUserLanguage(userId);
    const welcomeMessage = languageService.getText(
      userId,
      "welcome",
      "",
      config.name
    );

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: userLang === "uk" ? "📋 Допомога" : "📋 Help",
            callback_data: "help",
          },
        ],
        [
          {
            text: userLang === "uk" ? "⚙️ Налаштування" : "⚙️ Settings",
            callback_data: "settings",
          },
        ],
        [{ text: "🌐 Language / Мова", callback_data: "language" }],
      ],
    };

    // Додати кнопку адміна для адмінів
    if (botStateService.isAdmin(userId)) {
      keyboard.inline_keyboard.push([
        {
          text: userLang === "uk" ? "🔧 Панель адміна" : "🔧 Admin Panel",
          callback_data: "admin_panel",
        },
      ]);
    }

    await bot.editMessageText(welcomeMessage, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  static async showAdminPanel(chatId, messageId, bot, userId) {
    const adminMessage = languageService.getText(userId, "adminPanel");
    const statusMessage = botStateService.getStatusMessage(
      userId,
      languageService
    );
    const keyboard = botStateService.getAdminKeyboard(userId, languageService);

    await bot.editMessageText(`${adminMessage}\n\n${statusMessage}`, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  static async toggleBot(chatId, messageId, bot, userId, queryId) {
    const result = botStateService.toggle(userId);
    const userLang = languageService.getUserLanguage(userId);

    if (result.success) {
      const statusText = result.enabled
        ? userLang === "uk"
          ? "✅ Бот увімкнений!"
          : "✅ Bot enabled!"
        : userLang === "uk"
          ? "🔴 Бот вимкнений!"
          : "🔴 Bot disabled!";

      await bot.answerCallbackQuery(queryId, {
        text: statusText,
        show_alert: true,
      });

      // Оновити панель адміністратора
      await this.showAdminPanel(chatId, messageId, bot, userId);
    } else {
      const errorText =
        userLang === "uk"
          ? "Помилка при зміні стану бота"
          : "Error changing bot state";

      await bot.answerCallbackQuery(queryId, {
        text: errorText,
        show_alert: true,
      });
    }
  }

  /**
   * Show throttle statistics
   */
  static async showThrottleStats(chatId, messageId, bot, userId) {
    const userLang = languageService.getUserLanguage(userId);
    const stats = throttleService.getStats();

    const statsText =
      userLang === "uk"
        ? `📊 <b>Статистика троттлінгу</b>\n\n` +
          `👥 Активні користувачі: ${stats.activeUsers}\n` +
          `💬 Активні чати: ${stats.activeChats}\n` +
          `⏱️ Активні ліміти: ${stats.activeRateLimits}\n\n` +
          `<b>Налаштування:</b>\n` +
          `🔹 Приватний чат: ${stats.config.userCooldown.private}мс\n` +
          `🔹 Групи: ${stats.config.userCooldown.group}мс\n` +
          `🔹 Адміни: ${stats.config.userCooldown.admin}мс\n` +
          `🔹 Груповий кулдаун: ${stats.config.chatCooldown.group}мс`
        : `📊 <b>Throttle Statistics</b>\n\n` +
          `👥 Active users: ${stats.activeUsers}\n` +
          `💬 Active chats: ${stats.activeChats}\n` +
          `⏱️ Active rate limits: ${stats.activeRateLimits}\n\n` +
          `<b>Configuration:</b>\n` +
          `🔹 Private chat: ${stats.config.userCooldown.private}ms\n` +
          `🔹 Groups: ${stats.config.userCooldown.group}ms\n` +
          `🔹 Admins: ${stats.config.userCooldown.admin}ms\n` +
          `🔹 Group cooldown: ${stats.config.chatCooldown.group}ms`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: userLang === "uk" ? "🔄 Оновити" : "🔄 Refresh",
            callback_data: "admin_throttle_stats",
          },
        ],
        [
          {
            text: userLang === "uk" ? "🧹 Скинути" : "🧹 Reset",
            callback_data: "admin_throttle_reset",
          },
        ],
        [
          {
            text: userLang === "uk" ? "⬅️ Назад" : "⬅️ Back",
            callback_data: "admin_panel",
          },
        ],
      ],
    };

    await bot.editMessageText(statsText, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  /**
   * Show throttle reset menu
   */
  static async showThrottleResetMenu(chatId, messageId, bot, userId) {
    const userLang = languageService.getUserLanguage(userId);

    const resetText =
      userLang === "uk"
        ? `🧹 <b>Скинути троттлінг</b>\n\n` + `Оберіть що скинути:`
        : `🧹 <b>Reset Throttling</b>\n\n` + `Choose what to reset:`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text:
              userLang === "uk" ? "👤 Скинути користувача" : "👤 Reset User",
            callback_data: "admin_throttle_reset_user",
          },
        ],
        [
          {
            text: userLang === "uk" ? "🗑️ Скинути все" : "🗑️ Reset All",
            callback_data: "admin_throttle_reset_all",
          },
        ],
        [
          {
            text: userLang === "uk" ? "⬅️ Назад" : "⬅️ Back",
            callback_data: "admin_throttle_stats",
          },
        ],
      ],
    };

    await bot.editMessageText(resetText, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  /**
   * Reset user throttle (admin can input user ID)
   */
  static async resetUserThrottle(chatId, messageId, bot, userId, queryId) {
    const userLang = languageService.getUserLanguage(userId);

    // For now, reset the admin's own throttle as example
    throttleService.resetUser(userId);

    const successText =
      userLang === "uk"
        ? "Троттлінг користувача скинуто!"
        : "User throttle reset!";

    await bot.answerCallbackQuery(queryId, {
      text: successText,
      show_alert: true,
    });

    await this.showThrottleStats(chatId, messageId, bot, userId);
  }

  /**
   * Reset all throttling data
   */
  static async resetAllThrottle(chatId, messageId, bot, userId, queryId) {
    const userLang = languageService.getUserLanguage(userId);

    // Clear all throttling data
    throttleService.cleanup();

    const successText =
      userLang === "uk"
        ? "Всі дані троттлінгу скинуто!"
        : "All throttling data reset!";

    await bot.answerCallbackQuery(queryId, {
      text: successText,
      show_alert: true,
    });

    await this.showThrottleStats(chatId, messageId, bot, userId);
  }
}

module.exports = CallbackHandler;
