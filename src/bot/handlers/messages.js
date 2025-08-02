const geminiService = require("../services/gemini");
const config = require("../../../config/bot");
const languageService = require("../services/language");
const botStateService = require("../services/botState");
const throttleService = require("../services/throttle");

class MessageHandler {
  static async handleMessage(msg, bot) {
    // Skip if it's a command
    if (msg.text && msg.text.startsWith("/")) return;

    // Skip old messages (older than 30 seconds to prevent spam on startup)
    const messageAge = Date.now() / 1000 - msg.date;
    if (messageAge > 30) {
      return; // Ignore old messages to prevent startup spam
    }

    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;

    // 💾 АВТОМАТИЧНО ЗБЕРІГАЄМО ВСІ ПОВІДОМЛЕННЯ до бази даних з embeddings
    // Визначаємо тип повідомлення та медіа-опис
    const messageType = this.getMessageType(msg);
    let mediaCaption = null;
    
    if (msg.photo && msg.caption) {
      mediaCaption = `Фото: ${msg.caption}`;
    } else if (msg.document && msg.caption) {
      mediaCaption = `Документ: ${msg.caption}`;
    } else if (msg.voice) {
      mediaCaption = 'Голосове повідомлення';
    } else if (msg.sticker) {
      mediaCaption = `Стікер: ${msg.sticker.emoji || ''}`;
    }

    // Зберігаємо повідомлення до бази даних
    await geminiService.saveMessageToDatabase(msg, messageType, mediaCaption);

    // For group chats, always add messages to context for conversation tracking
    if (chatType !== "private") {
      geminiService.addToContext(chatId, msg);
    }

    // Для особистого чату - відповідати ШІ замість показу статусу
    if (chatType === "private") {
      // Перевірити чи бот має відповідати (вимкнений = тільки адміни)
      if (!botStateService.shouldRespond(userId)) {
        const statusMessage = botStateService.getStatusMessage(
          userId,
          languageService
        );
        await bot.sendMessage(chatId, statusMessage, {
          parse_mode: "HTML",
          reply_to_message_id: msg.message_id,
        });
        return;
      }

      // Перевірити троттлінг для приватного чату
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

      // Обробити повідомлення в приватному чаті
      await this.handlePrivateMessage(msg, bot);
      return;
    }

    // Для групових чатів - перевірити чи бот має відповідати
    // Якщо бот вимкнений, просто мовчати (не спамити)
    if (!botStateService.shouldRespond(userId)) {
      return; // Мовчазно ігнорувати повідомлення в групах коли бот вимкнений
    }

    // Handle group chat mentions and replies
    if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
      // DEBUG: Логування для діагностики
      console.log(
        `📝 Group message from ${msg.from.first_name}: "${msg.text}"`
      );

      // Спочатку перевіряємо чи бот згаданий або відповідь до нього
      const botUsername = config.username;
      console.log(`🤖 Bot username: ${botUsername}`);

      const isMentioned =
        msg.text &&
        (msg.text.includes(`@${botUsername}`) ||
          msg.text.toLowerCase().includes("гряг") ||
          msg.text.toLowerCase().includes("gryag"));
      const isReplyToBot = msg.reply_to_message?.from?.username === botUsername;

      console.log(
        `📢 Is mentioned: ${isMentioned}, Is reply to bot: ${isReplyToBot}`
      );
      console.log(
        `🔍 Text includes @${botUsername}: ${msg.text?.includes(`@${botUsername}`)}`
      );
      console.log(
        `🔍 Text includes гряг: ${msg.text?.toLowerCase().includes("гряг")}`
      );
      console.log(
        `🔍 Text includes gryag: ${msg.text?.toLowerCase().includes("gryag")}`
      );

      if (!isMentioned && !isReplyToBot) {
        console.log(`🔇 Ignoring message - no mention or reply`);
        return; // Не відповідати на повідомлення без згадок
      }

      console.log(`✅ Processing group message - bot mentioned or replied to`);

      // Тепер перевіряємо троттлінг лише для згаданих повідомлень
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

      await this.handleGroupMessage(msg, bot);
      return;
    }

    // Handle private chat messages - це більше не потрібно, так як всі особисті повідомлення показують статус
    // Цей код залишається для сумісності, але не виконується
    switch (messageType) {
      case "text":
        await this.handleTextMessage(msg, bot);
        break;
      case "photo":
        await this.handlePhotoMessage(msg, bot);
        break;
      case "document":
        await this.handleDocumentMessage(msg, bot);
        break;
      case "voice":
        await this.handleVoiceMessage(msg, bot);
        break;
      default:
        await this.handleUnsupportedMessage(msg, bot);
    }
  }

  static async handleGroupMessage(msg, bot) {
    try {
      const userId = msg.from.id;

      // Перевірити чи бот має відповідати в групі (дублюючи перевірку для безпеки)
      if (!botStateService.shouldRespond(userId)) {
        return; // Якщо бот вимкнений і користувач не адмін, не відповідати
      }

      // На цьому етапі згадка вже перевірена в handleMessage, тому одразу генеруємо відповідь
      const botUsername = config.username;

      // Add message to context before generating response
      geminiService.addToContext(msg.chat.id, msg);

      // Show typing indicator
      await bot.sendChatAction(msg.chat.id, "typing");

      // Generate AI response
      const response = await geminiService.generateContextualResponse(
        msg,
        botUsername
      );

      if (response) {
        // Add bot response to context
        const botMessage = {
          from: { first_name: "Бот", is_bot: true },
          text: response,
          date: Math.floor(Date.now() / 1000),
        };
        geminiService.addToContext(msg.chat.id, botMessage);

        // Send response to group
        const sentMessage = await bot.sendMessage(msg.chat.id, response, {
          reply_to_message_id: msg.message_id,
        });

        // 💾 ЗБЕРЕГТИ ВІДПОВІДЬ БОТА до бази даних
        if (sentMessage) {
          await geminiService.saveBotResponseToDatabase(
            msg.chat.id, 
            response, 
            msg.message_id
          );
        }
      }
    } catch (error) {
      console.error("Error handling group message:", error);
      const userId = msg.from.id;
      const errorMessage = languageService.getText(userId, "errorProcessing");
      await bot.sendMessage(msg.chat.id, errorMessage, {
        reply_to_message_id: msg.message_id,
      });
    }
  }

  static async handlePrivateMessage(msg, bot) {
    try {
      const userId = msg.from.id;
      const chatId = msg.chat.id;
      const messageType = this.getMessageType(msg);

      // Show typing indicator
      await bot.sendChatAction(chatId, "typing");

      let response;

      // Handle different message types with multimodal support
      switch (messageType) {
        case "text":
          // Add message to context before generating response
          geminiService.addToContext(msg.chat.id, msg);

          response = await geminiService.generateContextualResponse(
            msg,
            config.username
          );
          break;

        case "photo":
          // Add photo message to context
          geminiService.addToContext(msg.chat.id, {
            ...msg,
            text: `[фото: ${msg.caption || "без підпису"}]`,
          });

          response = await this.handlePhotoWithAI(msg, bot);
          break;

        case "document":
          // Add document message to context
          geminiService.addToContext(msg.chat.id, {
            ...msg,
            text: `[документ: ${msg.document?.file_name || "файл"}]`,
          });

          response = await this.handleDocumentWithAI(msg, bot);
          break;

        case "voice":
          response = await this.handleVoiceWithAI(msg, bot);
          break;

        case "audio":
          // Add audio message to context
          geminiService.addToContext(msg.chat.id, {
            ...msg,
            text: "[аудіо повідомлення]",
          });

          response = await this.handleAudioWithAI(msg, bot);
          break;

        case "video":
          // Add video message to context
          geminiService.addToContext(msg.chat.id, {
            ...msg,
            text: "[відео повідомлення]",
          });

          response = await this.handleVideoWithAI(msg, bot);
          break;

        case "sticker":
          // Add sticker message to context
          geminiService.addToContext(msg.chat.id, { ...msg, text: "[стікер]" });

          response = await this.handleStickerWithAI(msg, bot);
          break;

        default:
          response = languageService.getText(userId, "unsupportedMediaType");
      }

      if (response) {
        // Add bot response to context
        const botMessage = {
          from: { first_name: "Бот", is_bot: true },
          text: response,
          date: Math.floor(Date.now() / 1000),
        };
        geminiService.addToContext(msg.chat.id, botMessage);

        // Send response to user
        const sentMessage = await bot.sendMessage(chatId, response, {
          reply_to_message_id: msg.message_id,
        });

        // 💾 ЗБЕРЕГТИ ВІДПОВІДЬ БОТА до бази даних
        if (sentMessage) {
          await geminiService.saveBotResponseToDatabase(
            chatId, 
            response, 
            msg.message_id
          );
        }
      }
    } catch (error) {
      console.error("Error handling private message:", error);
      const userId = msg.from.id;
      const errorMessage = languageService.getText(userId, "errorProcessing");
      await bot.sendMessage(msg.chat.id, errorMessage, {
        reply_to_message_id: msg.message_id,
      });
    }
  }

  static getMessageType(msg) {
    if (msg.text) return "text";
    if (msg.photo) return "photo";
    if (msg.document) return "document";
    if (msg.voice) return "voice";
    if (msg.audio) return "audio";
    if (msg.video) return "video";
    if (msg.sticker) return "sticker";
    return "unknown";
  }

  static async handleTextMessage(msg, bot) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Auto-detect and set language
    languageService.autoDetectAndSetLanguage(userId, msg.text);

    // For private chats, use AI response
    try {
      await bot.sendChatAction(chatId, "typing");

      const response = await geminiService.generateResponse(msg.text, {
        userId: userId,
        userName: msg.from.first_name,
      });

      await bot.sendMessage(chatId, response);
    } catch (error) {
      console.error("Error generating AI response:", error);

      // Fallback message in user's language
      const fallbackMessage = languageService.getText(userId, "aiGenericError");
      await bot.sendMessage(chatId, fallbackMessage);
    }
  }

  static async handlePhotoMessage(msg, bot) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const photoMessage = languageService.getText(userId, "photoReceived");
    await bot.sendMessage(chatId, photoMessage);
  }

  static async handleDocumentMessage(msg, bot) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const fileName = msg.document.file_name || "Unknown file";
    const documentMessage = languageService.getText(
      userId,
      "documentReceived",
      fileName
    );
    await bot.sendMessage(chatId, documentMessage);
  }

  static async handleVoiceMessage(msg, bot) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const voiceMessage = languageService.getText(userId, "voiceReceived");
    await bot.sendMessage(chatId, voiceMessage);
  }

  static async handleUnsupportedMessage(msg, bot) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const unsupportedMessage = languageService.getText(
      userId,
      "unsupportedMessage"
    );
    await bot.sendMessage(chatId, unsupportedMessage);
  }

  /**
   * Handle throttle responses with localized messages
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

  // Multimodal AI handlers for different media types

  static async handlePhotoWithAI(msg, bot) {
    try {
      const userId = msg.from.id;
      const photo = msg.photo[msg.photo.length - 1]; // Get highest resolution
      const fileInfo = await bot.getFile(photo.file_id);
      const caption = msg.caption || "";

      // Get photo URL
      const photoUrl = `https://api.telegram.org/file/bot${config.token}/${fileInfo.file_path}`;

      // Generate response using Gemini Vision
      return await geminiService.generateVisionResponse(
        photoUrl,
        caption,
        userId
      );
    } catch (error) {
      console.error("Error processing photo:", error);
      return languageService.getText(msg.from.id, "errorProcessingPhoto");
    }
  }

  static async handleDocumentWithAI(msg, bot) {
    try {
      const userId = msg.from.id;
      const document = msg.document;
      const caption = msg.caption || "";

      // Check if it's a text file or image
      if (document.mime_type?.startsWith("text/")) {
        const fileInfo = await bot.getFile(document.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${config.token}/${fileInfo.file_path}`;

        // Download and read text content
        const response = await fetch(fileUrl);
        const textContent = await response.text();

        return await geminiService.generateDocumentResponse(
          textContent,
          caption,
          document.file_name,
          userId
        );
      } else if (document.mime_type?.startsWith("image/")) {
        // Treat as image
        const fileInfo = await bot.getFile(document.file_id);
        const imageUrl = `https://api.telegram.org/file/bot${config.token}/${fileInfo.file_path}`;

        return await geminiService.generateVisionResponse(
          imageUrl,
          caption,
          userId
        );
      } else {
        return languageService.getText(
          userId,
          "documentTypeNotSupported",
          document.mime_type
        );
      }
    } catch (error) {
      console.error("Error processing document:", error);
      return languageService.getText(msg.from.id, "errorProcessingDocument");
    }
  }

  static async handleVoiceWithAI(msg, bot) {
    try {
      const userId = msg.from.id;
      // Voice messages are not yet supported by Gemini directly
      // Could implement speech-to-text here in future
      return languageService.getText(userId, "voiceNotSupported");
    } catch (error) {
      console.error("Error processing voice:", error);
      return languageService.getText(msg.from.id, "errorProcessingVoice");
    }
  }

  static async handleAudioWithAI(msg, bot) {
    try {
      const userId = msg.from.id;
      // Audio files are not yet supported by Gemini directly
      return languageService.getText(userId, "audioNotSupported");
    } catch (error) {
      console.error("Error processing audio:", error);
      return languageService.getText(msg.from.id, "errorProcessingAudio");
    }
  }

  static async handleVideoWithAI(msg, bot) {
    try {
      const userId = msg.from.id;
      const video = msg.video;
      const caption = msg.caption || "";

      // Videos are not yet fully supported by Gemini, but we can try to extract frames
      // For now, just acknowledge the video
      return languageService.getText(userId, "videoNotSupported");
    } catch (error) {
      console.error("Error processing video:", error);
      return languageService.getText(msg.from.id, "errorProcessingVideo");
    }
  }

  static async handleStickerWithAI(msg, bot) {
    try {
      const userId = msg.from.id;
      const sticker = msg.sticker;

      if (sticker.is_animated || sticker.is_video) {
        return languageService.getText(userId, "animatedStickerNotSupported");
      }

      // Static stickers can be processed as images
      const fileInfo = await bot.getFile(sticker.file_id);
      const stickerUrl = `https://api.telegram.org/file/bot${config.token}/${fileInfo.file_path}`;

      return await geminiService.generateVisionResponse(
        stickerUrl,
        "sticker",
        userId
      );
    } catch (error) {
      console.error("Error processing sticker:", error);
      return languageService.getText(msg.from.id, "errorProcessingSticker");
    }
  }
}

module.exports = MessageHandler;
