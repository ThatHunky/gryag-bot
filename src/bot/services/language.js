class LanguageService {
  constructor() {
    this.languages = {
      en: {
        na        help: (        na        help: (botUsername) => `📚 <b>Доступні команди:</b>

🔹 /start - Запустити бота
🔹 /help - Показати це повідомлення довідки
🔹 /settings - Налаштування бота
🔹 /status - Перевірити статус бота
🔹 /test - Тестувати ШІ з'єднання
🔹 /lang - Змінити мову
🔹 /stats - Переглянути статистику бази даних

<b>Функції групового чату:</b>
• Згадайте мене @${botUsername} щоб отримати відповіді ШІ
• Відповідайте на мої повідомлення для продовження розмови
• Я відповідаю розумно, використовуючи Google Gemini AI з семантичним пошуком

<b>Приватний чат:</b>
• Просто надішліть мені будь-яке повідомлення і я відповім за допомогою ШІ`,`📚 <b>Доступні команди:</b>

🔹 /start - Запустити бота
🔹 /help - Показати це повідомлення довідки
🔹 /settings - Налаштування бота
🔹 /status - Перевірити статус бота
🔹 /test - Тестувати ШІ з'єднання
🔹 /lang - Змінити мову
🔹 /stats - Переглянути статистику бази даних

<b>Функції групового чату:</b>
• Згадайте мене @${botUsername} щоб отримати відповіді ШІ
• Відповідайте на мої повідомлення для продовження розмови
• Я відповідаю розумно, використовуючи Google Gemini AI з семантичним пошуком

<b>Приватний чат:</b>
• Просто надішліть мені будь-яке повідомлення і я відповім за допомогою ШІ`,        welcome: (name, botName) =>
          `🎉 Welcome to ${botName}, ${name}!\n\nI'm here to help you with various tasks. Use /help to see what I can do.`,
        help: (botUsername) => `📚 <b>Available Commands:</b>

🔹 /start - Start the bot
🔹 /help - Show this help message
🔹 /settings - Configure bot settings
🔹 /status - Check bot status
🔹 /test - Test AI connection
🔹 /lang - Change language
🔹 /stats - View database statistics

<b>Group Chat Features:</b>
• Mention me with @${botUsername} to get AI responses
• Reply to my messages to continue conversations
• I'll respond intelligently using Google Gemini AI with semantic search

<b>Private Chat:</b>
• Just send me any message and I'll respond with AI`,
        settings: "⚙️ <b>Settings</b>\n\nChoose a category:",
        status: "✅ Bot is running normally!",
        testAI: "🔄 Testing AI connection...",
        testSuccess:
          "✅ AI is working perfectly! Try mentioning me in a group or sending a message.",
        testFailed:
          "❌ AI connection failed. Please check the GEMINI_API_KEY configuration.",
        photoReceived: "📸 Nice photo! I can see you sent me an image.",
        documentReceived: (fileName) => `📄 Document received: ${fileName}`,
        voiceReceived:
          "🎤 Voice message received! Audio processing coming soon.",
        unsupportedMessage: "❓ I don't understand this type of message yet.",
        errorProcessing:
          "Sorry, I encountered an error processing your message.",
        aiNotConfigured:
          "Sorry, I'm not properly configured. Please check the Gemini API key.",
        aiQuotaExceeded:
          "Sorry, I've reached my usage limit. Please try again later.",
        aiSafetyFilter:
          "I can't provide a response to that message due to safety guidelines.",
        aiGenericError:
          "Sorry, I encountered an error generating a response. Please try again.",
        languageChanged: (lang) => `✅ Language changed to ${lang}`,
        chooseLanguage: "🌐 <b>Choose Language / Оберіть мову</b>",

        // Multimodal support messages
        errorProcessingPhoto: "❌ Error processing photo. Please try again.",
        errorProcessingDocument:
          "❌ Error processing document. Please try again.",
        errorProcessingVoice:
          "❌ Error processing voice message. Please try again.",
        errorProcessingAudio:
          "❌ Error processing audio file. Please try again.",
        errorProcessingVideo: "❌ Error processing video. Please try again.",
        errorProcessingSticker:
          "❌ Error processing sticker. Please try again.",
        documentTypeNotSupported: (mimeType) =>
          `📄 Document type not supported: ${mimeType}`,
        voiceNotSupported:
          "🎤 Voice messages are not yet supported, but coming soon!",
        audioNotSupported:
          "🎵 Audio files are not yet supported, but coming soon!",
        videoNotSupported:
          "🎬 Video processing is not yet supported, but coming soon!",
        animatedStickerNotSupported:
          "🎭 Animated stickers are not yet supported.",
        unsupportedMediaType: "❓ This media type is not yet supported.",

        adminPanel: "🔧 <b>Admin Panel</b>\n\nManage bot settings:",
        notAdmin: "❌ Access denied. This command is for administrators only.",
        botDisabled:
          "🔴 <b>Bot is currently disabled</b>\n\nOnly admins can interact with the bot.\n\n💡 <i>Use /start or /admin commands for management</i>",
        throttleUserCooldown: (timeLeft) =>
          `⏰ <b>Please wait ${timeLeft}</b>\n\nYou're sending messages too quickly. Please slow down a bit.`,
        throttleRateLimit: (resetTime) =>
          `🚫 <b>Rate limit exceeded</b>\n\nYou've reached the message limit. Try again in ${resetTime}.`,
        systemPrompt: `You are a helpful AI assistant in a Telegram group chat. Keep responses concise and conversational. Be friendly but not overly chatty. Respond naturally to questions and mentions. If someone asks for help, provide useful information. Don't repeat the user's message back to them. Keep responses under 200 words unless specifically asked for more detail.`,
        
        // Database statistics
        statsTitle: "📊 Database Statistics",
        statsNoChatData: "💬 No messages in database for this chat yet",
        statsCacheInfo: "🧠 Embeddings Cache",
      },
      uk: {
        name: "Українська",
        welcome: (name, botName) =>
          `🎉 Ласкаво просимо до ${botName}, ${name}!\n\nЯ тут, щоб допомогти вам з різними завданнями. Використовуйте /help, щоб побачити, що я можу робити.`,
        help: (botUsername) => `📚 <b>Доступні команди:</b>

🔹 /start - Запустити бота
🔹 /help - Показати це повідомлення довідки
🔹 /settings - Налаштування бота
🔹 /status - Перевірити статус бота
🔹 /test - Тестувати ШІ з'єднання
🔹 /lang - Змінити мову

<b>Функції групового чату:</b>
• Згадайте мене @${botUsername} щоб отримати відповіді ШІ
• Відповідайте на мої повідомлення для продовження розмови
• Я відповідаю розумно, використовуючи Google Gemini AI

<b>Приватний чат:</b>
• Просто надішліть мені будь-яке повідомлення, і я відповім за допомогою ШІ`,
        settings: "⚙️ <b>Налаштування</b>\n\nОберіть категорію:",
        status: "✅ Бот працює нормально!",
        testAI: "🔄 Тестування ШІ з'єднання...",
        testSuccess:
          "✅ ШІ працює ідеально! Спробуйте згадати мене в групі або надіслати повідомлення.",
        testFailed:
          "❌ Помилка з'єднання з ШІ. Будь ласка, перевірте конфігурацію GEMINI_API_KEY.",
        photoReceived:
          "📸 Гарне фото! Я бачу, що ви надіслали мені зображення.",
        documentReceived: (fileName) => `📄 Документ отримано: ${fileName}`,
        voiceReceived:
          "🎤 Голосове повідомлення отримано! Обробка аудіо незабаром.",
        unsupportedMessage: "❓ Я ще не розумію цей тип повідомлення.",
        errorProcessing:
          "Вибачте, виникла помилка при обробці вашого повідомлення.",
        aiNotConfigured:
          "Вибачте, я неправильно налаштований. Будь ласка, перевірте ключ Gemini API.",
        aiQuotaExceeded:
          "Вибачте, я досяг ліміту використання. Спробуйте пізніше.",
        aiSafetyFilter:
          "Я не можу відповісти на це повідомлення через вказівки безпеки.",
        aiGenericError:
          "Вибачте, виникла помилка при генерації відповіді. Спробуйте знову.",
        languageChanged: (lang) => `✅ Мову змінено на ${lang}`,
        chooseLanguage: "🌐 <b>Choose Language / Оберіть мову</b>",

        // Multimodal support messages
        errorProcessingPhoto: "❌ Помилка обробки фото. Спробуйте знову.",
        errorProcessingDocument:
          "❌ Помилка обробки документа. Спробуйте знову.",
        errorProcessingVoice:
          "❌ Помилка обробки голосового повідомлення. Спробуйте знову.",
        errorProcessingAudio:
          "❌ Помилка обробки аудіо файлу. Спробуйте знову.",
        errorProcessingVideo: "❌ Помилка обробки відео. Спробуйте знову.",
        errorProcessingSticker: "❌ Помилка обробки стікера. Спробуйте знову.",
        documentTypeNotSupported: (mimeType) =>
          `📄 Тип документа не підтримується: ${mimeType}`,
        voiceNotSupported:
          "🎤 Голосові повідомлення поки не підтримуються, але незабаром!",
        audioNotSupported:
          "🎵 Аудіо файли поки не підтримуються, але незабаром!",
        videoNotSupported:
          "🎬 Обробка відео поки не підтримується, але незабаром!",
        animatedStickerNotSupported:
          "🎭 Анімовані стікери поки не підтримуються.",
        unsupportedMediaType: "❓ Цей тип медіа поки не підтримується.",

        adminPanel:
          "🔧 <b>Панель адміністратора</b>\n\nУправління налаштуваннями бота:",
        notAdmin:
          "❌ Доступ заборонено. Ця команда тільки для адміністраторів.",
        botDisabled:
          "🔴 <b>Бот наразі вимкнений</b>\n\nТільки адміни можуть взаємодіяти з ботом.\n\n💡 <i>Використовуйте команди /start або /admin для управління</i>",
        throttleUserCooldown: (timeLeft) =>
          `⏰ <b>Зачекайте ${timeLeft}</b>\n\nВи надсилаєте повідомлення занадто швидко. Будь ласка, повільніше.`,
        throttleRateLimit: (resetTime) =>
          `🚫 <b>Перевищено ліміт швидкості</b>\n\nВи досягли ліміту повідомлень. Спробуйте знову через ${resetTime}.`,
        systemPrompt: `Ти корисний ШІ-асистент у груповому чаті Telegram. Відповідай стисло і розмовно українською мовою. Будь дружелюбним, але не надто балакучим. Відповідай природно на запитання та згадки. Якщо хтось просить допомоги, надавай корисну інформацію. Не повторюй повідомлення користувача назад. Тримай відповіді в межах 200 слів, якщо не просять більше деталей. Завжди відповідай українською мовою.`,
        
        // Database statistics
        statsTitle: "📊 Статистика бази даних",
        statsNoChatData: "💬 Повідомлень в базі даних для цього чату поки немає",
        statsCacheInfo: "🧠 Кеш embeddings",
      },
    };

    this.defaultLanguage = "uk"; // Ukrainian by default
    this.userLanguages = new Map(); // Store user language preferences
  }

  getUserLanguage(userId) {
    return this.userLanguages.get(userId) || this.defaultLanguage;
  }

  setUserLanguage(userId, language) {
    if (this.languages[language]) {
      this.userLanguages.set(userId, language);
      return true;
    }
    return false;
  }

  getText(userId, key, ...args) {
    const language = this.getUserLanguage(userId);
    const text = this.languages[language][key];

    if (typeof text === "function") {
      return text(...args);
    }
    return text || this.languages[this.defaultLanguage][key];
  }

  getSystemPrompt(userId) {
    const language = this.getUserLanguage(userId);
    return this.languages[language].systemPrompt;
  }

  getLanguageKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: "🇺🇸 English", callback_data: "lang_en" },
          { text: "🇺🇦 Українська", callback_data: "lang_uk" },
        ],
        [{ text: "🔙 Back / Назад", callback_data: "main_menu" }],
      ],
    };
  }

  detectLanguage(text) {
    // Simple language detection
    const ukrainianChars = /[а-яіїєґ]/i;
    const englishChars = /[a-z]/i;

    const ukCount = (text.match(ukrainianChars) || []).length;
    const enCount = (text.match(englishChars) || []).length;

    if (ukCount > enCount) return "uk";
    return "en";
  }

  autoDetectAndSetLanguage(userId, text) {
    if (!this.userLanguages.has(userId)) {
      const detectedLang = this.detectLanguage(text);
      this.setUserLanguage(userId, detectedLang);
      return detectedLang;
    }
    return this.getUserLanguage(userId);
  }
}

module.exports = new LanguageService();
