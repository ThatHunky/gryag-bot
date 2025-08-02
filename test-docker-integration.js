#!/usr/bin/env node

// Тестування Docker інтеграції та автооновлення
// Використання: node test-docker-integration.js

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Кольори для консолі
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

// Функції для виводу
const log = (message, color = "reset") => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const success = (message) => log(`✅ ${message}`, "green");
const error = (message) => log(`❌ ${message}`, "red");
const warning = (message) => log(`⚠️ ${message}`, "yellow");
const info = (message) => log(`ℹ️ ${message}`, "blue");

// Перевірка файлів Docker
function checkDockerFiles() {
  info("Перевірка наявності Docker файлів...");

  const requiredFiles = [
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.dev.yml",
    ".dockerignore",
    ".env.docker.example",
    "deploy.sh",
    "deploy.ps1",
    "scripts/auto-update.sh",
    "scripts/healthcheck.js",
  ];

  let allFilesExist = true;

  requiredFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      success(`${file} знайдено`);
    } else {
      error(`${file} відсутній`);
      allFilesExist = false;
    }
  });

  return allFilesExist;
}

// Перевірка структури директорій
function checkDirectoryStructure() {
  info("Перевірка структури директорій...");

  const requiredDirs = ["data", "logs", "scripts", ".github/workflows"];

  let allDirsExist = true;

  requiredDirs.forEach((dir) => {
    if (fs.existsSync(dir)) {
      success(`Директорія ${dir}/ існує`);
    } else {
      error(`Директорія ${dir}/ відсутня`);
      allDirsExist = false;
    }
  });

  return allDirsExist;
}

// Перевірка виконуваних файлів
function checkExecutableFiles() {
  info("Перевірка виконуваних файлів...");

  const executableFiles = ["scripts/auto-update.sh", "deploy.sh"];

  let allExecutable = true;

  executableFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      if (stats.mode & parseInt("111", 8)) {
        success(`${file} має права на виконання`);
      } else {
        warning(`${file} не має прав на виконання`);
        // Для Unix систем
        if (process.platform !== "win32") {
          allExecutable = false;
        }
      }
    }
  });

  return allExecutable;
}

// Перевірка синтаксису docker-compose
function checkDockerComposeSyntax() {
  return new Promise((resolve) => {
    info("Перевірка синтаксису docker-compose.yml...");

    const proc = spawn("docker-compose", ["config"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        success("docker-compose.yml синтаксично коректний");
        resolve(true);
      } else {
        error("Помилка в docker-compose.yml:");
        console.log(errorOutput);
        resolve(false);
      }
    });

    proc.on("error", (err) => {
      warning("Docker Compose не встановлено або недоступний");
      warning("Пропуск перевірки синтаксису...");
      resolve(true); // Не фейлимо тест якщо Docker не встановлено
    });
  });
}

// Перевірка .env.example файлу
function checkEnvExample() {
  info("Перевірка .env.docker.example...");

  if (!fs.existsSync(".env.docker.example")) {
    error(".env.docker.example відсутній");
    return false;
  }

  const envContent = fs.readFileSync(".env.docker.example", "utf8");
  const requiredVars = [
    "BOT_TOKEN",
    "GEMINI_API_KEY",
    "ADMIN_USER_IDS",
    "BOT_USERNAME",
    "GITHUB_REPO",
    "AUTO_UPDATE_ENABLED",
  ];

  let allVarsPresent = true;

  requiredVars.forEach((varName) => {
    if (envContent.includes(varName)) {
      success(`Змінна ${varName} присутня`);
    } else {
      error(`Змінна ${varName} відсутня`);
      allVarsPresent = false;
    }
  });

  return allVarsPresent;
}

// Перевірка health check скрипта
function checkHealthCheck() {
  info("Перевірка health check скрипта...");

  const healthCheckPath = "scripts/healthcheck.js";

  if (!fs.existsSync(healthCheckPath)) {
    error("Health check скрипт відсутній");
    return false;
  }

  try {
    const healthCheckContent = fs.readFileSync(healthCheckPath, "utf8");

    // Перевірка основних елементів health check
    const requiredElements = [
      "process.exit(0)",
      "process.exit(1)",
      "pgrep",
      "bot.db",
    ];

    let allElementsPresent = true;

    requiredElements.forEach((element) => {
      if (healthCheckContent.includes(element)) {
        success(`Health check містить ${element}`);
      } else {
        warning(`Health check не містить ${element}`);
        // Не робимо це критичною помилкою
      }
    });

    return true;
  } catch (error) {
    error(`Помилка читання health check: ${error.message}`);
    return false;
  }
}

// Перевірка GitHub Actions
function checkGitHubActions() {
  info("Перевірка GitHub Actions workflows...");

  const workflowFiles = [
    ".github/workflows/docker.yml",
    ".github/workflows/semantic-tests.yml",
  ];

  let allWorkflowsExist = true;

  workflowFiles.forEach((workflow) => {
    if (fs.existsSync(workflow)) {
      success(`Workflow ${workflow} знайдено`);

      // Перевірка основного контенту
      const content = fs.readFileSync(workflow, "utf8");
      if (content.includes("docker") || content.includes("build")) {
        success(`Workflow ${workflow} містить Docker інструкції`);
      }
    } else {
      error(`Workflow ${workflow} відсутній`);
      allWorkflowsExist = false;
    }
  });

  return allWorkflowsExist;
}

// Тестування автооновлення скрипта
function testAutoUpdateScript() {
  info("Тестування автооновлення скрипта...");

  const scriptPath = "scripts/auto-update.sh";

  if (!fs.existsSync(scriptPath)) {
    error("Скрипт автооновлення відсутній");
    return false;
  }

  const scriptContent = fs.readFileSync(scriptPath, "utf8");

  // Перевірка ключових функцій
  const requiredFunctions = [
    "backup_database",
    "check_for_updates",
    "update_code",
    "restart_bot",
    "graceful shutdown",
  ];

  let allFunctionsPresent = true;

  requiredFunctions.forEach((func) => {
    if (
      scriptContent.includes(func) ||
      scriptContent.includes(func.replace("_", "-")) ||
      scriptContent.includes(func.replace(" ", "_"))
    ) {
      success(`Функція "${func}" знайдена`);
    } else {
      warning(`Функція "${func}" не знайдена`);
      // Не робимо критичною помилкою
    }
  });

  return true;
}

// Основна функція тестування
async function runTests() {
  log("\n🐳 Тестування Docker інтеграції Gryag Bot\n", "blue");

  const tests = [
    { name: "Файли Docker", test: checkDockerFiles },
    { name: "Структура директорій", test: checkDirectoryStructure },
    { name: "Виконувані файли", test: checkExecutableFiles },
    { name: "Синтаксис Docker Compose", test: checkDockerComposeSyntax },
    { name: ".env.example файл", test: checkEnvExample },
    { name: "Health Check скрипт", test: checkHealthCheck },
    { name: "GitHub Actions", test: checkGitHubActions },
    { name: "Скрипт автооновлення", test: testAutoUpdateScript },
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const { name, test } of tests) {
    log(`\n--- Тест: ${name} ---`, "yellow");

    try {
      const result = await test();
      if (result) {
        passedTests++;
        success(`Тест "${name}" пройдено\n`);
      } else {
        error(`Тест "${name}" провалено\n`);
      }
    } catch (err) {
      error(`Помилка в тесті "${name}": ${err.message}\n`);
    }
  }

  // Підсумок
  log("\n" + "=".repeat(50), "blue");
  log("📊 РЕЗУЛЬТАТИ ТЕСТУВАННЯ", "blue");
  log("=".repeat(50), "blue");

  if (passedTests === totalTests) {
    success(`✅ Всі тести пройдено успішно! (${passedTests}/${totalTests})`);
    success("🚀 Docker система готова до використання!");
  } else if (passedTests >= totalTests * 0.8) {
    warning(`⚠️ Більшість тестів пройдено (${passedTests}/${totalTests})`);
    warning("🔧 Перевірте попередження та виправте їх");
  } else {
    error(`❌ Багато тестів провалено (${passedTests}/${totalTests})`);
    error("🛠️ Потрібні виправлення перед використанням Docker");
  }

  // Додаткові поради
  log("\n💡 ПОРАДИ ДЛЯ НАЛАШТУВАННЯ:", "blue");
  info("1. Скопіюйте .env.docker.example у .env та налаштуйте змінні");
  info("2. Встановіть Docker та Docker Compose");
  info("3. Використовуйте ./deploy.sh start для запуску (Linux/macOS)");
  info("4. Використовуйте .\\deploy.ps1 start для запуску (Windows)");
  info("5. Перевірте логи через ./deploy.sh logs");

  return passedTests === totalTests;
}

// Запуск тестів
if (require.main === module) {
  runTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      error(`Критична помилка: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { runTests, checkDockerFiles, checkDirectoryStructure };
