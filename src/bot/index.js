const TelegramBot = require("node-telegram-bot-api");
const config = require("../../config/bot");
const commandHandler = require("./handlers/commands");
const messageHandler = require("./handlers/messages");
const callbackHandler = require("./handlers/callbacks");
const geminiService = require("./services/gemini");
const languageService = require("./services/language");

class GryagBot {
  constructor() {
    this.bot = new TelegramBot(config.token, { polling: config.polling });
    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupHandlers() {
    // Command handlers
    this.bot.onText(/\/start/, (msg) => commandHandler.start(msg, this.bot));
    this.bot.onText(/\/help/, (msg) => commandHandler.help(msg, this.bot));
    this.bot.onText(/\/settings/, (msg) =>
      commandHandler.settings(msg, this.bot)
    );
    this.bot.onText(/\/test/, (msg) => commandHandler.test(msg, this.bot));
    this.bot.onText(/\/lang/, (msg) => commandHandler.language(msg, this.bot));
    this.bot.onText(/\/language/, (msg) =>
      commandHandler.language(msg, this.bot)
    );
    this.bot.onText(/\/admin/, (msg) => commandHandler.admin(msg, this.bot));
    this.bot.onText(/\/stats/, (msg) => commandHandler.stats(msg, this.bot));

    // 🔍 Search commands
    this.bot.onText(/\/search/, (msg) => commandHandler.search(msg, this.bot));
    this.bot.onText(/\/пошук/, (msg) => commandHandler.search(msg, this.bot));
    this.bot.onText(/\/factcheck/, (msg) =>
      commandHandler.factcheck(msg, this.bot)
    );
    this.bot.onText(/\/фактчек/, (msg) =>
      commandHandler.factcheck(msg, this.bot)
    );
    this.bot.onText(/\/news/, (msg) => commandHandler.news(msg, this.bot));
    this.bot.onText(/\/новини/, (msg) => commandHandler.news(msg, this.bot));

    // Status command with multilingual support
    this.bot.onText(/\/status/, (msg) => {
      // Skip old messages to prevent startup spam
      const messageAge = Date.now() / 1000 - msg.date;
      if (messageAge > 30) return;

      const userId = msg.from.id;
      const statusMessage = languageService.getText(userId, "status");
      this.bot.sendMessage(msg.chat.id, statusMessage);
    });

    // Message handlers (non-commands)
    this.bot.on("message", (msg) => {
      if (!msg.text || !msg.text.startsWith("/")) {
        messageHandler.handleMessage(msg, this.bot);
      }
    });

    // Callback query handlers
    this.bot.on("callback_query", (query) =>
      callbackHandler.handleCallback(query, this.bot)
    );
  }

  setupErrorHandling() {
    this.bot.on("error", (error) => {
      console.error("Bot error:", error);
    });

    this.bot.on("polling_error", (error) => {
      console.error("Polling error:", error);
    });
  }

  start() {
    console.log(`🚀 ${config.name} started successfully!`);
    console.log(`📊 Mode: ${config.polling ? "Polling" : "Webhook"}`);

    // Test Gemini connection
    geminiService.testConnection();

    // Handle graceful shutdown
    process.on("SIGTERM", () => this.stop());
    process.on("SIGINT", () => this.stop());
  }
  async stop() {
    console.log("🛑 Зупинка бота...");

    try {
      // Зупинка polling
      if (this.bot) {
        await this.bot.stopPolling();
        console.log("✅ Telegram polling зупинено");
      }

      // Очищення PID файлу
      const fs = require("fs").promises;
      const path = require("path");
      const pidFile = path.join(__dirname, "..", "..", "bot.pid");

      try {
        await fs.access(pidFile);
        await fs.unlink(pidFile);
        console.log("🗑️ PID файл видалено");
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.warn("⚠️ Не вдалося видалити PID файл:", err.message);
        }
      }

      console.log("✅ Бот зупинено успішно");
    } catch (error) {
      console.error("❌ Помилка при зупинці бота:", error);
      throw error;
    }
  }
}

module.exports = GryagBot;
