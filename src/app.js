const GryagBot = require("./bot");

// Initialize and start the bot
const bot = new GryagBot();
bot.start();

// Graceful shutdown для Docker
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log("Shutdown already in progress...");
    return;
  }

  isShuttingDown = true;
  console.log(`\n🔄 Отримано сигнал ${signal}. Початок graceful shutdown...`);

  try {
    // Зупинка бота
    if (bot && typeof bot.stop === "function") {
      console.log("🛑 Зупинка Telegram Bot...");
      await bot.stop();
    }

    // Збереження стану та очищення ресурсів
    console.log("💾 Збереження стану...");

    // Дати час для завершення поточних операцій
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("✅ Graceful shutdown завершено");
    process.exit(0);
  } catch (error) {
    console.error("❌ Помилка під час shutdown:", error);
    process.exit(1);
  }
};

// Обробка сигналів для graceful shutdown
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Global error handling
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);

  // Спроба graceful shutdown при критичній помилці
  if (!isShuttingDown) {
    gracefulShutdown("UNCAUGHT_EXCEPTION");
  } else {
    process.exit(1);
  }
});

// Збереження PID для моніторингу
const fs = require("fs").promises;
const path = require("path");

(async () => {
  try {
    const pidFile = path.join(__dirname, "..", "bot.pid");
    await fs.writeFile(pidFile, process.pid.toString());
    console.log(`📝 PID збережено: ${process.pid}`);
  } catch (error) {
    console.warn("⚠️ Не вдалося зберегти PID файл:", error.message);
  }
})();
