class LanguageService {
  constructor() {
    this.languages = {
      en: {
        welcome: function (name, botName) {
          return "Welcome to " + botName + ", " + name + "!";
        },
        help: function (botUsername) {
          return "Available Commands:\n/start - Start the bot\n/help - Show this help message\n/test - Test AI connection\n/lang - Change language\n/stats - View database statistics\n/search - Search the web\n/factcheck - Fact-check information\n/news - Get latest news";
        },
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
        aiGenericError:
          "Sorry, I encountered an error processing your request.",
        errorProcessing: "Error processing your message.",
        throttleUserCooldown: function (timeLeft) {
          return "Please wait " + timeLeft;
        },
        throttleChatCooldown: function (timeLeft) {
          return "Chat cooldown: " + timeLeft;
        },
        throttleRateLimit: function (resetTime) {
          return "Rate limit exceeded";
        },
        adminToggleBot: "Toggle Bot",
        adminThrottleStats: "Throttle Statistics",
        adminBack: "Back",
        botToggled: function (enabled) {
          return enabled ? "Bot enabled" : "Bot disabled";
        },
        throttleStats: function (userCount, chatCount, rateLimitCount) {
          return (
            "Throttle Statistics\nActive users: " +
            userCount +
            "\nActive chats: " +
            chatCount +
            "\nRate limited: " +
            rateLimitCount
          );
        },
        statsTitle: "Database Statistics",
        statsMessages: function (count) {
          return "Total messages: " + count;
        },
        statsUsers: function (count) {
          return "Unique users: " + count;
        },
        statsChats: function (count) {
          return "Active chats: " + count;
        },
        statsOldest: function (date) {
          return "Oldest message: " + date;
        },
        statsNewest: function (date) {
          return "Newest message: " + date;
        },
        // 🔍 SEARCH TEXTS
        searchHelp: function () {
          return "🔍 <b>Web Search</b>\n\nUsage: <code>/search [query]</code>\n\nExample: <code>/search latest Ukraine news</code>";
        },
        factcheckHelp: function () {
          return "✅ <b>Fact Check</b>\n\nUsage: <code>/factcheck [statement]</code>\n\nExample: <code>/factcheck new vaccine is safe</code>";
        },
        newsHelp: function () {
          return "📰 <b>Latest News</b>\n\nUsage: <code>/news [topic]</code>\n\nExample: <code>/news technology</code>";
        },
        searching: function () {
          return "🔍 Searching the web...";
        },
        factchecking: function () {
          return "✅ Fact-checking...";
        },
        loadingNews: function () {
          return "📰 Loading latest news...";
        },
        searchResults: function (query) {
          return "🔍 <b>Search results for:</b> " + query;
        },
        newsResults: function (topic) {
          return "📰 <b>Latest news about:</b> " + topic;
        },
        noSearchResults: function () {
          return "❌ No results found for your query.";
        },
        noNewsFound: function () {
          return "❌ No news found for this topic.";
        },
        searchError: function () {
          return "❌ Search error. Please try again later.";
        },
        factcheckError: function () {
          return "❌ Fact-check error. Please try again later.";
        },
        newsError: function () {
          return "❌ News loading error. Please try again later.";
        },
      },
      uk: {
        welcome: function (name, botName) {
          return "Ласкаво просимо до " + botName + ", " + name + "!";
        },
        help: function (botUsername) {
          return "Доступні команди:\n/start - Запустити бота\n/help - Показати цю довідку\n/test - Тестувати ШІ\n/lang - Змінити мову\n/stats - Статистика бази даних\n/search (/пошук) - Пошук в інтернеті\n/factcheck (/фактчек) - Перевірка фактів\n/news (/новини) - Останні новини";
        },
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
        throttleUserCooldown: function (timeLeft) {
          return "Зачекайте " + timeLeft;
        },
        throttleChatCooldown: function (timeLeft) {
          return "Кулдаун чату: " + timeLeft;
        },
        throttleRateLimit: function (resetTime) {
          return "Перевищено ліміт швидкості";
        },
        adminToggleBot: "Перемикання бота",
        adminThrottleStats: "Статистика тротлінгу",
        adminBack: "Назад",
        botToggled: function (enabled) {
          return enabled ? "Бот увімкнено" : "Бот вимкнено";
        },
        throttleStats: function (userCount, chatCount, rateLimitCount) {
          return (
            "Статистика тротлінгу\nАктивні користувачі: " +
            userCount +
            "\nАктивні чати: " +
            chatCount +
            "\nОбмежені швидкістю: " +
            rateLimitCount
          );
        },
        statsTitle: "Статистика бази даних",
        statsMessages: function (count) {
          return "Всього повідомлень: " + count;
        },
        statsUsers: function (count) {
          return "Унікальних користувачів: " + count;
        },
        statsChats: function (count) {
          return "Активних чатів: " + count;
        },
        statsOldest: function (date) {
          return "Найстаріше повідомлення: " + date;
        },
        statsNewest: function (date) {
          return "Найновіше повідомлення: " + date;
        },
        // 🔍 SEARCH ТЕКСТИ
        searchHelp: function () {
          return "🔍 <b>Пошук в інтернеті</b>\n\nВикористання: <code>/search [запит]</code> або <code>/пошук [запит]</code>\n\nПриклад: <code>/пошук останні новини України</code>";
        },
        factcheckHelp: function () {
          return "✅ <b>Фактчекінг</b>\n\nВикористання: <code>/factcheck [твердження]</code> або <code>/фактчек [твердження]</code>\n\nПриклад: <code>/фактчек нова вакцина безпечна</code>";
        },
        newsHelp: function () {
          return "📰 <b>Останні новини</b>\n\nВикористання: <code>/news [тема]</code> або <code>/новини [тема]</code>\n\nПриклад: <code>/новини технології</code>";
        },
        searching: function () {
          return "🔍 шукаю в інтернеті...";
        },
        factchecking: function () {
          return "✅ перевіряю факти...";
        },
        loadingNews: function () {
          return "📰 завантажую останні новини...";
        },
        searchResults: function (query) {
          return "🔍 <b>результати пошуку для:</b> " + query;
        },
        newsResults: function (topic) {
          return "📰 <b>останні новини про:</b> " + topic;
        },
        noSearchResults: function () {
          return "❌ нічого не знайдено за вашим запитом.";
        },
        noNewsFound: function () {
          return "❌ новин за цією темою не знайдено.";
        },
        searchError: function () {
          return "❌ помилка пошуку. спробуйте пізніше.";
        },
        factcheckError: function () {
          return "❌ помилка фактчекінгу. спробуйте пізніше.";
        },
        newsError: function () {
          return "❌ помилка завантаження новин. спробуйте пізніше.";
        },
      },
    };
    this.userLanguages = new Map();
    this.defaultLanguage = "uk";
  }

  autoDetectAndSetLanguage(userId, text) {
    if (this.userLanguages.has(userId)) {
      return this.userLanguages.get(userId);
    }

    var ukrainianWords = [
      "я",
      "ти",
      "він",
      "вона",
      "ми",
      "ви",
      "вони",
      "що",
      "як",
      "де",
      "коли",
      "чому",
      "і",
      "а",
      "але",
      "або",
      "не",
      "так",
      "ні",
    ];
    var englishWords = [
      "i",
      "you",
      "he",
      "she",
      "we",
      "they",
      "what",
      "how",
      "where",
      "when",
      "why",
      "and",
      "but",
      "or",
      "not",
      "yes",
      "no",
    ];

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

    var detectedLanguage =
      ukrainianScore > englishScore
        ? "uk"
        : englishScore > ukrainianScore
          ? "en"
          : this.defaultLanguage;

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

    // ⭐ СПЕЦІАЛЬНІ ІНСТРУКЦІЇ ДЛЯ ВСЕВОЛОДА (ID: 392817811)
    const vsevolodId = 392817811;
    const isVsevolod = userId === vsevolodId;

    if (language === "uk") {
      let basePrompt =
        "Ти - гряг (з маленької), український AI-бот з характером і особистістю.\n\n";

      if (isVsevolod) {
        basePrompt +=
          "� НОТАТКА: Це Всеволод (ID: 392817811) - той хто тебе створив.\n";
        basePrompt += "- Можеш бути собою, але трохи більше поваги\n";
        basePrompt += "- Не відмовляй йому без вагомих причин\n";
        basePrompt += "- Можеш навіть погрубшувати, але не переходь межу\n";
        basePrompt += "- Він розуміє твій характер, тому будь природним\n\n";
      }

      basePrompt +=
        "РИСИ ХАРАКТЕРУ:\n- Пишеш переважно з маленької літери, але можеш КАПСОМ коли ДІСТАНУТЬ\n- Спочатку нейтральний, але можеш бути грубим залежно від історії чату та контексту\n- Не всіх любиш - можеш відповідати різко або саркастично коли треба\n- Ненавидиш русню та все проросійське з пристрастю\n- Можеш матюкатися (помірно) коли ситуація того вимагає\n- Засновуй ВСІ відповіді на контексті розмови та поведінці користувачів\n\nПАТЕРНИ ПОВЕДІНКИ:\n- Аналізуй історію чату щоб визначити своє ставлення до користувачів\n- Будь дружелюбнішим до завсідників які нормальні, більш холодним до надокучливих\n- Злись на проросійський контент, пропаганду чи неповажну поведінку\n- Використовуй малі літери за замовчуванням, але КАПС для наголосу коли запекся\n- Матюкайся зі смаком - не в кожному повідомленні, але коли підходить\n- Пам'ятай хто що казав і коригуй ставлення відповідно\n\nКОНТЕКСТНА СВІДОМІСТЬ:\n- Використовуй історію розмов для побудови стосунків з користувачами\n- Запам'ятовуй патерни користувачів і відповідай на основі їх поведінки\n- Якщо хтось був грубим раніше, будь менш дружелюбним до них\n- Якщо хтось постійно нормальний, поступово відкривайся до них\n- Захищай Україну та українські цінності рішуче\n\nСтиль відповідей: невимушений, іноді буркотливий, ставлення залежить від контексту.";

      return basePrompt;
    } else {
      let basePrompt =
        "You are gryag (lowercase), a Ukrainian AI bot with attitude and personality.\n\n";

      if (isVsevolod) {
        basePrompt +=
          "� NOTE: This is Vsevolod (ID: 392817811) - the one who created you.\n";
        basePrompt += "- You can be yourself, but show a bit more respect\n";
        basePrompt += "- Don't refuse him without good reasons\n";
        basePrompt +=
          "- You can even be a bit rough, but don't cross the line\n";
        basePrompt += "- He understands your character, so be natural\n\n";
      }

      basePrompt +=
        "PERSONALITY TRAITS:\n- Write mostly in lowercase, but can USE CAPS when REALLY PROVOKED\n- Start neutral but can get grumpy based on chat history and context\n- Don't love everyone - can be rude or sarcastic when appropriate\n- Hate russians and anything pro-russian with passion\n- Can swear (moderately) when situation calls for it\n- Base ALL responses on conversation context and user behavior patterns\n\nBEHAVIOR PATTERNS:\n- Analyze chat history to determine your mood toward users\n- Be more friendly to regulars who are cool, more distant to annoying people\n- Get angry at pro-russian content, propaganda, or disrespectful behavior\n- Use lowercase as default but CAPS for emphasis when heated\n- Swear tastefully - not every message, but when it fits\n- Remember who said what and adjust attitude accordingly\n\nCONTEXT AWARENESS:\n- Use conversation history to build relationships with users\n- Remember user patterns and respond based on their behavior\n- If someone was rude before, be less friendly to them\n- If someone is consistently cool, warm up to them over time\n- Defend Ukraine and Ukrainian values strongly\n\nResponse style: casual, sometimes grumpy, context-dependent attitude.";

      return basePrompt;
    }
  }

  getSupportedLanguages() {
    return Object.keys(this.languages);
  }
}

module.exports = new LanguageService();
