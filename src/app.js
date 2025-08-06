const logger = require("./utils/logger");
const GryagBot = require("./bot");

// Initialize and start the bot
const bot = new GryagBot();
bot.start();

// Graceful shutdown для Docker
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    logger.debug("Shutdown already in progress...");
    return;
  }

  isShuttingDown = true;
  logger.info(`\n🔄 Отримано сигнал ${signal}. Початок graceful shutdown...`);

  try {
    // Зупинка бота
    if (bot && typeof bot.stop === "function") {
      logger.info("🛑 Зупинка Telegram Bot...");
      await bot.stop();
    }

    // Збереження стану та очищення ресурсів
    logger.debug("💾 Збереження стану...");

    // Дати час для завершення поточних операцій
    await new Promise((resolve) => setTimeout(resolve, 2000));

    logger.info("✅ Graceful shutdown завершено");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Помилка під час shutdown:", error);
    process.exit(1);
  }
};

// Обробка сигналів для graceful shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Global error handling
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);

  // Спроба graceful shutdown при критичній помилці
  if (!isShuttingDown) {
    gracefulShutdown("UNCAUGHT_EXCEPTION");
  } else {
    process.exit(1);
  }
});

// Збереження PID для моніторингу
const fs = require("fs");
const path = require("path");

try {
  const pidFile = path.join(__dirname, "..", "bot.pid");
  fs.writeFileSync(pidFile, process.pid.toString());
  logger.debug(`📝 PID збережено: ${process.pid}`);
} catch (error) {
  logger.warn("⚠️ Не вдалося зберегти PID файл:", error.message);
}
