class LanguageService {
  constructor() {
    this.languages = {
      en: {
        welcome: function(name, botName) { return "Welcome to " + botName + ", " + name + "!"; },
        help: function(botUsername) { return "Available Commands:\n/start - Start the bot\n/help - Show this help message\n/test - Test AI connection\n/lang - Change language\n/stats - View database statistics"; },
        settings: "Settings",
        status: "Bot Status", 
        adminPanel: "Admin Panel",
        language: "Language",
        languageChanged: "Language changed successfully!",
        testSuccess: "AI connection test successful!",
        testAiResponse: "AI Response Test",
        botEnabled: "Bot is enabled",
        botDisabled: "Bot is disabled", 
        notAdmin: "You are not authorized to use this command.",
        aiGenericError: "Sorry, I encountered an error processing your request.",
        errorProcessing: "Error processing your message.",
        throttleUserCooldown: function(timeLeft) { return "Please wait " + timeLeft; },
        throttleChatCooldown: function(timeLeft) { return "Chat cooldown: " + timeLeft; },
        throttleRateLimit: function(resetTime) { return "Rate limit exceeded"; },
        adminToggleBot: "Toggle Bot",
        adminThrottleStats: "Throttle Statistics", 
        adminBack: "Back",
        botToggled: function(enabled) { return enabled ? "Bot enabled" : "Bot disabled"; },
        throttleStats: function(userCount, chatCount, rateLimitCount) { return "Throttle Statistics\nActive users: " + userCount + "\nActive chats: " + chatCount + "\nRate limited: " + rateLimitCount; },
        statsTitle: "Database Statistics",
        statsMessages: function(count) { return "Total messages: " + count; },
        statsUsers: function(count) { return "Unique users: " + count; },
        statsChats: function(count) { return "Active chats: " + count; },
        statsOldest: function(date) { return "Oldest message: " + date; },
        statsNewest: function(date) { return "Newest message: " + date; }
      },
      uk: {
        welcome: function(name, botName) { return "Ласкаво просимо до " + botName + ", " + name + "!"; },
        help: function(botUsername) { return "Доступні команди:\n/start - Запустити бота\n/help - Показати цю довідку\n/test - Тестувати ШІ\n/lang - Змінити мову\n/stats - Статистика бази даних"; },
        settings: "Налаштування",
        status: "Статус бота",
        adminPanel: "Панель адміністратора", 
        language: "Мова",
        languageChanged: "Мову успішно змінено!",
        testSuccess: "Тест з*єднання ШІ успішний!",
        testAiResponse: "Тест відповіді ШІ",
        botEnabled: "Бот увімкнено",
        botDisabled: "Бот вимкнено",
        notAdmin: "Ви не маєте прав для використання цієї команди.",
        aiGenericError: "Вибачте, виникла помилка при обробці вашого запиту.",
        errorProcessing: "Помилка обробки вашого повідомлення.",
        throttleUserCooldown: function(timeLeft) { return "Зачекайте " + timeLeft; },
        throttleChatCooldown: function(timeLeft) { return "Кулдаун чату: " + timeLeft; },
        throttleRateLimit: function(resetTime) { return "Перевищено ліміт швидкості"; },
        adminToggleBot: "Перемикання бота",
        adminThrottleStats: "Статистика тротлінгу",
        adminBack: "Назад",
        botToggled: function(enabled) { return enabled ? "Бот увімкнено" : "Бот вимкнено"; },
        throttleStats: function(userCount, chatCount, rateLimitCount) { return "Статистика тротлінгу\nАктивні користувачі: " + userCount + "\nАктивні чати: " + chatCount + "\nОбмежені швидкістю: " + rateLimitCount; },
        statsTitle: "Статистика бази даних",
        statsMessages: function(count) { return "Всього повідомлень: " + count; },
        statsUsers: function(count) { return "Унікальних користувачів: " + count; },
        statsChats: function(count) { return "Активних чатів: " + count; },
        statsOldest: function(date) { return "Найстаріше повідомлення: " + date; },
        statsNewest: function(date) { return "Найновіше повідомлення: " + date; }
      }
    };
    this.userLanguages = new Map();
    this.defaultLanguage = "uk";
  }

  autoDetectAndSetLanguage(userId, text) {
    if (this.userLanguages.has(userId)) {
      return this.userLanguages.get(userId);
    }
    
    var ukrainianWords = ["я", "ти", "він", "вона", "ми", "ви", "вони", "що", "як", "де", "коли", "чому", "і", "а", "але", "або", "не", "так", "ні"];
    var englishWords = ["i", "you", "he", "she", "we", "they", "what", "how", "where", "when", "why", "and", "but", "or", "not", "yes", "no"];
    
    if (!text) {
      this.userLanguages.set(userId, this.defaultLanguage);
      return this.defaultLanguage;
    }
    
    var words = text.toLowerCase().split(/\s+/);
    var ukrainianScore = 0;
    var englishScore = 0;
    
    for (var i = 0; i < words.length; i++) {
      if (ukrainianWords.indexOf(words[i]) !== -1) ukrainianScore++;
      if (englishWords.indexOf(words[i]) !== -1) englishScore++;
    }
    
    var detectedLanguage = ukrainianScore > englishScore ? "uk" : 
                          englishScore > ukrainianScore ? "en" : 
                          this.defaultLanguage;
    
    this.userLanguages.set(userId, detectedLanguage);
    return detectedLanguage;
  }

  setUserLanguage(userId, language) {
    if (this.languages[language]) {
      this.userLanguages.set(userId, language);
      return true;
    }
    return false;
  }

  getUserLanguage(userId) {
    return this.userLanguages.get(userId) || this.defaultLanguage;
  }

  getText(userId, key) {
    var args = Array.prototype.slice.call(arguments, 2);
    var language = this.getUserLanguage(userId);
    var text = this.languages[language][key];
    
    if (typeof text === "function") {
      return text.apply(null, args);
    }
    
    return text || this.languages[this.defaultLanguage][key] || key;
  }

  getSystemPrompt(userId) {
    var language = this.getUserLanguage(userId);
    
    if (language === "uk") {
      return "Ти - розумний асистент Gryag, дружелюбний Telegram бот, який спілкується українською мовою. Ти маєш доступ до історії розмов через семантичний пошук, що дозволяє тобі знаходити релевантний контекст з попередніх розмов. Відповідай природно, корисно та дружелюбно. Використовуй емодзі де це доречно. Якщо в контексті є релевантна інформація з минулих розмов, використовуй її для кращих відповідей. Будь стислим, але інформативним.";
    } else {
      return "You are Gryag, a friendly Telegram bot assistant that communicates in English. You have access to conversation history through semantic search, allowing you to find relevant context from previous conversations. Respond naturally, helpfully, and in a friendly manner. Use emojis where appropriate. If there is relevant information from past conversations in the context, use it to provide better responses. Be concise but informative.";
    }
  }

  getSupportedLanguages() {
    return Object.keys(this.languages);
  }
}

module.exports = new LanguageService();
