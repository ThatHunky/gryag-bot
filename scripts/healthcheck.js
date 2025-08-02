// Health check скрипт для Docker контейнера
// Перевіряє чи працює бот коректно

const fs = require("fs");
const path = require("path");

// Функція для перевірки роботи бота
async function healthCheck() {
  try {
    // Перевірка чи існує файл з PID бота
    const pidFile = path.join(__dirname, "..", "bot.pid");

    // Перевірка чи працює основний процес
    const { spawn } = require("child_process");
    const ps = spawn("pgrep", ["-f", "node.*app.js"]);

    let processFound = false;

    ps.stdout.on("data", (data) => {
      if (data.toString().trim()) {
        processFound = true;
      }
    });

    ps.on("close", (code) => {
      if (processFound) {
        console.log("✅ Bot process is running");

        // Перевірка доступності бази даних
        const dbPath = path.join(__dirname, "..", "data", "bot.db");
        if (fs.existsSync(dbPath)) {
          console.log("✅ Database is accessible");

          // Перевірка логів на предмет критичних помилок
          const logPath = "/var/log/auto-update.log";
          if (fs.existsSync(logPath)) {
            const logContent = fs.readFileSync(logPath, "utf8");
            const recentLogs = logContent.split("\n").slice(-10).join("\n");

            if (
              recentLogs.includes("ПОМИЛКА") ||
              recentLogs.includes("ERROR")
            ) {
              console.log("⚠️  Warning: Recent errors found in logs");
              process.exit(1);
            }
          }

          console.log("✅ Health check passed");
          process.exit(0);
        } else {
          console.log("❌ Database not accessible");
          process.exit(1);
        }
      } else {
        console.log("❌ Bot process not found");
        process.exit(1);
      }
    });

    ps.on("error", (error) => {
      console.log("❌ Error checking bot process:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
    process.exit(1);
  }
}

// Запуск health check
healthCheck();
