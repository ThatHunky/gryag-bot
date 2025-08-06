const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const languageService = require("./language");
const embeddingService = require("./embedding");
// Uses the global `fetch` available in Node.js 18+

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    this.visionModelName = "gemini-1.5-flash"; // Supports vision

    // Chat context storage - maps chatId to array of messages
    this.chatContexts = new Map();
    this.maxContextMessages = parseInt(process.env.MAX_CONTEXT_MESSAGES) || 100;
    this.contextMessagesForAI =
      parseInt(process.env.CONTEXT_MESSAGES_FOR_AI) || 20;

    if (!this.apiKey) {
      console.error("⚠️ GEMINI_API_KEY not found in environment variables");
      return;
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);

    // Налаштування безпеки - більш м'які обмеження
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE, // Не блокувати harassment
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE, // Не блокувати hate speech
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE, // Блокувати тільки явно сексуальний контент
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE, // Не блокувати небезпечний контент
      },
    ];

    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
      safetySettings: safetySettings,
    });
    this.visionModel = this.genAI.getGenerativeModel({
      model: this.visionModelName,
      safetySettings: safetySettings,
    });
  }

  // Add message to chat context
  addToContext(chatId, message) {
    if (!this.chatContexts.has(chatId)) {
      this.chatContexts.set(chatId, []);
    }

    const context = this.chatContexts.get(chatId);

    // Create context entry with detailed user info
    const contextEntry = {
      timestamp: Date.now(),
      userId: message.from.id,
      firstName: message.from.first_name || "User",
      lastName: message.from.last_name || "",
      username: message.from.username || "",
      text: message.text || "[медіа]",
      isBot: message.from.is_bot || false,
    };

    context.push(contextEntry);

    // Keep only last 100 messages
    if (context.length > this.maxContextMessages) {
      context.shift();
    }

    this.chatContexts.set(chatId, context);
  }

  // Get formatted context for AI with current message highlighted
  getFormattedContextWithCurrentMessage(chatId, currentMessage) {
    const context = this.chatContexts.get(chatId) || [];

    if (context.length === 0) {
      return "";
    }

    // Get last N messages excluding the current one (to avoid duplication)
    const messagesToShow = this.contextMessagesForAI;
    const recentMessages = context.slice(-(messagesToShow + 1), -1); // Exclude the last message (current)

    let formattedContext = "Контекст попередніх повідомлень:\n";
    for (const msg of recentMessages) {
      if (msg.isBot) {
        formattedContext += `Бот: ${msg.text}\n`;
      } else {
        // Format user info: FirstName LastName (@username, ID: 12345)
        let userInfo = msg.firstName;
        if (msg.lastName) userInfo += ` ${msg.lastName}`;
        if (msg.username) userInfo += ` (@${msg.username})`;
        userInfo += ` (ID: ${msg.userId})`;

        formattedContext += `${userInfo}: ${msg.text}\n`;
      }
    }
    formattedContext += "\n";

    // Add current message highlighted
    if (currentMessage) {
      let currentUserInfo = currentMessage.from.first_name;
      if (currentMessage.from.last_name)
        currentUserInfo += ` ${currentMessage.from.last_name}`;
      if (currentMessage.from.username)
        currentUserInfo += ` (@${currentMessage.from.username})`;
      currentUserInfo += ` (ID: ${currentMessage.from.id})`;

      let messageText = `>>> ПОТОЧНЕ ПОВІДОМЛЕННЯ від ${currentUserInfo}: "${currentMessage.text || "[медіа]"}"`;

      // Add reply information if this is a reply
      if (currentMessage.reply_to_message) {
        const replyTo = currentMessage.reply_to_message;
        let replyUserInfo = replyTo.from.first_name || "Unknown";
        if (replyTo.from.last_name)
          replyUserInfo += ` ${replyTo.from.last_name}`;
        if (replyTo.from.username)
          replyUserInfo += ` (@${replyTo.from.username})`;
        replyUserInfo += ` (ID: ${replyTo.from.id})`;

        const replyText = replyTo.text || replyTo.caption || "[медіа]";
        messageText += `\n    ↳ Відповідає на повідомлення від ${replyUserInfo}: "${replyText}"`;
      }

      formattedContext += messageText + "\n\n";
    }

    return formattedContext;
  }

  // Get formatted context for AI (original method kept for backward compatibility)
  getFormattedContext(chatId) {
    const context = this.chatContexts.get(chatId) || [];

    if (context.length === 0) {
      return "";
    }

    // Format last N messages for context (to avoid token limits)
    const recentMessages = context.slice(-this.contextMessagesForAI);

    let formattedContext = "Контекст попередніх повідомлень:\n";
    for (const msg of recentMessages) {
      if (msg.isBot) {
        formattedContext += `Бот: ${msg.text}\n`;
      } else {
        // Format user info: FirstName LastName (@username, ID: 12345)
        let userInfo = msg.firstName;
        if (msg.lastName) userInfo += ` ${msg.lastName}`;
        if (msg.username) userInfo += ` (@${msg.username})`;
        userInfo += ` (ID: ${msg.userId})`;

        formattedContext += `${userInfo}: ${msg.text}\n`;
      }
    }
    formattedContext += "\n";

    return formattedContext;
  }

  async generateResponse(prompt, context = {}, currentMessage = null) {
    if (!this.model) {
      const userId = context.userId || 0;
      return languageService.getText(userId, "aiNotConfigured");
    }

    try {
      // Get user-specific system prompt
      const userId = context.userId || 0;
      const systemPrompt = languageService.getSystemPrompt(userId);

      // Prepare the full prompt with context
      let fullPrompt = systemPrompt + "\n\n";

      // Add chat context if available
      if (context.chatId && currentMessage) {
        const chatContext = this.getFormattedContextWithCurrentMessage(
          context.chatId,
          currentMessage
        );
        if (chatContext) {
          fullPrompt += chatContext;
        }

        // 🔍 АВТОМАТИЧНИЙ СЕМАНТИЧНИЙ ПОШУК
        // Шукаємо релевантний контекст з історії чату
        const currentText = currentMessage.text || currentMessage.caption || "";
        if (currentText.length > 0) {
          const relevantContext = await embeddingService.findRelevantContext(
            context.chatId,
            currentText,
            3 // Максимум 3 релевантних повідомлення
          );

          if (relevantContext) {
            fullPrompt += relevantContext;
          }
        }
      } else if (context.chatId) {
        // Fallback to old method if no current message
        const chatContext = this.getFormattedContext(context.chatId);
        if (chatContext) {
          fullPrompt += chatContext;
        }
      }

      // Add context if this is a reply or mention
      if (context.isReply && context.replyToText) {
        fullPrompt += `User is replying to: "${context.replyToText}"\n\n`;
      }

      // If we have current message, it's already included in context as "ПОТОЧНЕ ПОВІДОМЛЕННЯ"
      // Otherwise, add the prompt normally
      if (!currentMessage) {
        if (context.userName) {
          fullPrompt += `User ${context.userName} says: `;
        }
        fullPrompt += prompt;
      } else {
        // Just add instruction to respond to current message
        fullPrompt += "Відповідь на поточне повідомлення:";
      }

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return text.trim();
    } catch (error) {
      console.error("Gemini API error:", error);

      const userId = context.userId || 0;

      if (error.message.includes("API_KEY")) {
        return languageService.getText(userId, "aiNotConfigured");
      } else if (error.message.includes("quota")) {
        return languageService.getText(userId, "aiQuotaExceeded");
      } else if (
        error.message.includes("safety") ||
        error.message.includes("PROHIBITED_CONTENT")
      ) {
        // Спробуємо більш нейтральну відповідь
        console.log(
          "🛡️ Контент заблокований Gemini в generateResponse, даю нейтральну відповідь"
        );
        return "Вибачте, не можу надати відповідь на це запитання. Можете перефразувати або спитати щось інше?";
      } else {
        return languageService.getText(userId, "aiGenericError");
      }
    }
  }

  // 🔍 ГЕНЕРАЦІЯ ВІДПОВІДІ З ПОШУКОМ В ІНТЕРНЕТІ
  async generateResponseWithSearch(context = {}) {
    if (!this.model) {
      const userId = context.userId || 0;
      return languageService.getText(userId, "aiNotConfigured");
    }

    try {
      // Get user-specific system prompt
      const userId = context.userId || 0;
      const systemPrompt = languageService.getSystemPrompt(userId);

      // Prepare the full prompt with context
      let fullPrompt = systemPrompt + "\n\n";

      // додаємо результати пошуку якщо є
      if (context.searchResults && context.searchResults.length > 0) {
        fullPrompt += "🔍 ІНФОРМАЦІЯ З ІНТЕРНЕТУ ДЛЯ ФАКТЧЕКІНГУ:\n\n";

        context.searchResults.forEach((result, index) => {
          fullPrompt += `${index + 1}. ${result.title}\n`;
          fullPrompt += `   ${result.snippet}\n`;
          fullPrompt += "\n";
        });

        fullPrompt +=
          "Використовуй цю інформацію для перевірки фактів, але завжди вказуй джерела. ";
        fullPrompt +=
          "Будь критичним до інформації і надавай збалансовану відповідь.\n\n";
      }

      // Add chat context if available
      if (context.chatId) {
        const chatContext = this.getFormattedContext(context.chatId);
        if (chatContext) {
          fullPrompt += chatContext;
        }

        // семантичний пошук в історії чату
        if (context.text && context.text.length > 0) {
          const relevantContext = await embeddingService.findRelevantContext(
            context.chatId,
            context.text,
            3
          );

          if (relevantContext) {
            fullPrompt += relevantContext;
          }
        }
      }

      // додаємо поточний запит
      if (context.userName) {
        fullPrompt += `User ${context.userName} запитує: `;
      }
      fullPrompt += context.text;

      console.log(
        "🤖 генерую відповідь з пошуком для:",
        context.text.substring(0, 50) + "..."
      );

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return text.trim();
    } catch (error) {
      console.error("❌ gemini api error з пошуком:", error);

      const userId = context.userId || 0;

      if (error.message.includes("API_KEY")) {
        return languageService.getText(userId, "aiNotConfigured");
      } else if (error.message.includes("quota")) {
        return languageService.getText(userId, "aiQuotaExceeded");
      } else if (
        error.message.includes("safety") ||
        error.message.includes("PROHIBITED_CONTENT")
      ) {
        console.log(
          "🛡️ Контент заблокований Gemini в generateResponseWithSearch, даю нейтральну відповідь"
        );
        return "Вибачте, не можу надати відповідь на це запитання. Можете перефразувати або спитати щось інше?";
      } else {
        return languageService.getText(userId, "aiGenericError");
      }
    }
  }

  // Generate response for images using Gemini Vision
  async generateVisionResponse(imageUrl, caption, userId) {
    if (!this.visionModel) {
      return languageService.getText(userId, "aiNotConfigured");
    }

    try {
      const systemPrompt = languageService.getSystemPrompt(userId);

      // Fetch image as base64
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      let mimeType = response.headers.get("content-type") || "image/jpeg";

      // Fix for Telegram API returning application/octet-stream for images
      if (
        mimeType === "application/octet-stream" ||
        !mimeType.startsWith("image/")
      ) {
        // For Telegram images, default to jpeg if MIME type is unknown
        mimeType = "image/jpeg";
        console.log(
          `Fixed MIME type from ${response.headers.get("content-type")} to ${mimeType}`
        );
      }

      // Validate MIME type for Gemini API
      const supportedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "image/tiff",
      ];

      if (!supportedMimeTypes.includes(mimeType)) {
        console.warn(`Unsupported MIME type for Gemini Vision: ${mimeType}`);
        return languageService.getText(userId, "documentTypeNotSupported");
      }

      const prompt = caption
        ? `${systemPrompt}\n\nAnalyze this image. User says: "${caption}"`
        : `${systemPrompt}\n\nAnalyze and describe this image.`;

      const result = await this.visionModel.generateContent([
        prompt,
        {
          inlineData: {
            data: base64,
            mimeType: mimeType,
          },
        },
      ]);

      const responseText = await result.response;
      return responseText.text().trim();
    } catch (error) {
      console.error("Gemini Vision API error:", error);

      if (
        error.message.includes("safety") ||
        error.message.includes("PROHIBITED_CONTENT")
      ) {
        console.log(
          "🛡️ Контент заблокований Gemini Vision, даю нейтральну відповідь"
        );
        return "Вибачте, не можу проаналізувати це зображення. Спробуйте інше або запитайте щось інше.";
      } else {
        return languageService.getText(userId, "aiGenericError");
      }
    }
  }

  // Generate response for document content
  async generateDocumentResponse(textContent, caption, fileName, userId) {
    if (!this.model) {
      return languageService.getText(userId, "aiNotConfigured");
    }

    try {
      const systemPrompt = languageService.getSystemPrompt(userId);

      let prompt = `${systemPrompt}\n\nAnalyze this document`;
      if (fileName) {
        prompt += ` (filename: ${fileName})`;
      }
      prompt += `:\n\n${textContent}`;

      if (caption) {
        prompt += `\n\nUser says: "${caption}"`;
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error("Gemini Document API error:", error);

      if (
        error.message.includes("safety") ||
        error.message.includes("PROHIBITED_CONTENT")
      ) {
        console.log(
          "🛡️ Контент заблокований Gemini Document, даю нейтральну відповідь"
        );
        return "Вибачте, не можу проаналізувати цей документ. Спробуйте інший або запитайте щось інше.";
      } else {
        return languageService.getText(userId, "aiGenericError");
      }
    }
  }

  // Enhanced contextual response with thread support and media context
  async generateContextualResponse(message, botUsername) {
    const text = message.text || "";
    const userId = message.from.id;

    // Auto-detect language and set if not set
    languageService.autoDetectAndSetLanguage(userId, text);

    // Create enhanced context with media support
    const context = await this.buildMessageContext(message);

    // Check if bot is mentioned
    const isMentioned =
      text.includes(`@${botUsername}`) ||
      text.toLowerCase().includes("гряг") ||
      text.toLowerCase().includes("gryag");
    const isReply = message.reply_to_message?.from?.username === botUsername;

    if (isMentioned || isReply) {
      // Clean the message text for AI processing
      let cleanText = text.replace(`@${botUsername}`, "").trim();

      if (!cleanText) {
        const userLang = languageService.getUserLanguage(userId);
        cleanText = userLang === "uk" ? "Привіт!" : "Hello!";
      }

      // If replying to a message with media, use multimodal response
      if (context.replyToMedia) {
        return await this.generateMultimodalResponse(
          cleanText,
          context,
          message
        );
      }

      return await this.generateResponse(cleanText, context, message);
    }

    return null; // Don't respond if not mentioned or replied to
  }

  // Build enhanced message context with media support
  async buildMessageContext(message) {
    const context = {
      userId: message.from.id,
      userName: message.from.first_name,
      chatId: message.chat.id,
      isReply: !!message.reply_to_message,
      replyToText: message.reply_to_message?.text,
      replyToCaption: message.reply_to_message?.caption,
      replyToMedia: null,
      replyToMediaType: null,
    };

    // Check if replying to a message with media
    if (message.reply_to_message) {
      const replyMsg = message.reply_to_message;

      if (replyMsg.photo) {
        context.replyToMedia = replyMsg.photo[replyMsg.photo.length - 1]; // Highest resolution
        context.replyToMediaType = "photo";
      } else if (replyMsg.document) {
        context.replyToMedia = replyMsg.document;
        context.replyToMediaType = "document";
      } else if (
        replyMsg.sticker &&
        !replyMsg.sticker.is_animated &&
        !replyMsg.sticker.is_video
      ) {
        context.replyToMedia = replyMsg.sticker;
        context.replyToMediaType = "sticker";
      } else if (replyMsg.video) {
        context.replyToMedia = replyMsg.video;
        context.replyToMediaType = "video";
      }
    }

    return context;
  }

  // Generate multimodal response with context from replied media
  async generateMultimodalResponse(userText, context, currentMessage = null) {
    if (!this.visionModel || !context.replyToMedia) {
      return await this.generateResponse(userText, context, currentMessage);
    }

    try {
      const config = require("../../../config/bot");
      const systemPrompt = languageService.getSystemPrompt(context.userId);

      let mediaUrl = null;
      let contextDescription = "";

      // Build context description
      if (context.replyToText || context.replyToCaption) {
        const originalText = context.replyToText || context.replyToCaption;
        contextDescription = `Користувач відповідає на повідомлення: "${originalText}"\n\n`;
      }

      // Get media URL based on type
      if (context.replyToMediaType === "photo") {
        const fileInfo = await this.getFileInfo(context.replyToMedia.file_id);
        mediaUrl = `https://api.telegram.org/file/bot${config.token}/${fileInfo.file_path}`;
        contextDescription += `Повідомлення містило фотографію.\n\n`;
      } else if (
        context.replyToMediaType === "document" &&
        context.replyToMedia.mime_type?.startsWith("image/")
      ) {
        const fileInfo = await this.getFileInfo(context.replyToMedia.file_id);
        mediaUrl = `https://api.telegram.org/file/bot${config.token}/${fileInfo.file_path}`;
        contextDescription += `Повідомлення містило зображення (документ): ${context.replyToMedia.file_name}\n\n`;
      } else if (context.replyToMediaType === "sticker") {
        const fileInfo = await this.getFileInfo(context.replyToMedia.file_id);
        mediaUrl = `https://api.telegram.org/file/bot${config.token}/${fileInfo.file_path}`;
        contextDescription += `Повідомлення містило стікер.\n\n`;
      }

      // If we have a media URL, use vision model
      if (mediaUrl) {
        const response = await fetch(mediaUrl);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        let mimeType = response.headers.get("content-type") || "image/jpeg";

        // Fix for Telegram API returning application/octet-stream for images
        if (
          mimeType === "application/octet-stream" ||
          !mimeType.startsWith("image/")
        ) {
          // For Telegram images, default to jpeg if MIME type is unknown
          mimeType = "image/jpeg";
          console.log(
            `Fixed MIME type from ${response.headers.get("content-type")} to ${mimeType}`
          );
        }

        // Validate MIME type for Gemini API
        const supportedMimeTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/bmp",
          "image/tiff",
        ];

        if (!supportedMimeTypes.includes(mimeType)) {
          console.warn(`Unsupported MIME type for Gemini Vision: ${mimeType}`);
          // Fallback to text-only response with context description
          const prompt = `${contextDescription}${context.userName} пише: "${userText}"`;
          return await this.generateResponse(prompt, context, currentMessage);
        }

        const prompt = `${systemPrompt}\n\n${contextDescription}${context.userName} пише: "${userText}"`;

        const result = await this.visionModel.generateContent([
          prompt,
          {
            inlineData: {
              data: base64,
              mimeType: mimeType,
            },
          },
        ]);

        const responseText = await result.response;
        return responseText.text().trim();
      } else {
        // Fallback to text-only response with context
        const prompt = `${contextDescription}${context.userName} пише: "${userText}"`;
        return await this.generateResponse(prompt, context, currentMessage);
      }
    } catch (error) {
      console.error("Multimodal response error:", error);

      // Fallback to regular response
      return await this.generateResponse(userText, context, currentMessage);
    }
  }

  // Helper function to get file info from Telegram
  async getFileInfo(fileId) {
    const config = require("../../../config/bot");
    const response = await fetch(
      `https://api.telegram.org/bot${config.token}/getFile?file_id=${fileId}`
    );
    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Failed to get file info: ${data.description}`);
    }

    return data.result;
  }

  // 💾 АВТОМАТИЧНЕ ЗБЕРЕЖЕННЯ ПОВІДОМЛЕНЬ до бази даних з embeddings
  async saveMessageToDatabase(
    message,
    messageType = "text",
    mediaCaption = null
  ) {
    try {
      const messageData = {
        chatId: message.chat.id,
        userId: message.from.id,
        firstName: message.from.first_name || "",
        lastName: message.from.last_name || "",
        username: message.from.username || "",
        messageText: message.text || "",
        messageType,
        mediaCaption,
        timestamp: message.date * 1000, // Telegram uses seconds, we use milliseconds
        replyToMessageId: message.reply_to_message?.message_id || null,
      };

      // Автоматично створюємо embedding і зберігаємо
      const messageId = await embeddingService.processMessage(messageData);

      if (messageId) {
        console.log(`💾 Saved message ${messageId} to database with embedding`);
      }

      return messageId;
    } catch (error) {
      console.error("❌ Error saving message to database:", error);
      return null;
    }
  }

  // Зберегти відповідь бота до бази даних
  async saveBotResponseToDatabase(
    chatId,
    responseText,
    replyToMessageId = null
  ) {
    try {
      const botMessageData = {
        chatId,
        userId: 0, // Bot ID is 0
        firstName: "Gryag Bot",
        lastName: "",
        username: process.env.BOT_USERNAME || "gryag_bot",
        messageText: responseText,
        messageType: "text",
        mediaCaption: null,
        timestamp: Date.now(),
        replyToMessageId,
      };

      const messageId = await embeddingService.processMessage(botMessageData);

      if (messageId) {
        console.log(`🤖 Saved bot response ${messageId} to database`);
      }

      return messageId;
    } catch (error) {
      console.error("❌ Error saving bot response to database:", error);
      return null;
    }
  }

  // Test the API connection
  async testConnection() {
    try {
      const response = await this.generateResponse("Hello, are you working?");
      console.log("✅ Gemini API connection successful");
      return true;
    } catch (error) {
      console.error("❌ Gemini API connection failed:", error.message);
      return false;
    }
  }
}

module.exports = new GeminiService();
