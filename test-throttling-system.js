#!/usr/bin/env node

/**
 * Тест троттлінг системи
 * Перевіряє роботу нових обмежень на пошук та згадки
 */

const throttleService = require("./src/bot/services/throttle");
const botStateService = require("./src/bot/services/botState");

console.log("🧪 Тестування розширеної троттлінг системи...\n");

// Тестові дані
const testUserId = 123456;
const testAdminId = 789012;

async function testSearchThrottling() {
  console.log("🔍 === Тестування троттлінгу пошуку (3/годину) ===");

  // Симуляція 4 пошукових запитів від звичайного користувача
  for (let i = 1; i <= 4; i++) {
    const result = throttleService.canMakeSearchQuery(testUserId);
    console.log(
      `Запит ${i}: ${result.allowed ? "✅ Дозволено" : "❌ Заблоковано"}`
    );

    if (result.allowed) {
      console.log(`   - Залишилось запитів: ${result.remaining}`);
    } else {
      const resetTimeSeconds = Math.ceil(
        (result.resetTime - Date.now()) / 1000
      );
      console.log(`   - Час до скидання: ${resetTimeSeconds}с`);
    }
  }

  console.log();
}

async function testMentionThrottling() {
  console.log("🤖 === Тестування троттлінгу згадок (3/хвилину) ===");

  // Симуляція 4 згадок від звичайного користувача
  for (let i = 1; i <= 4; i++) {
    const result = throttleService.canMentionGryag(testUserId);
    console.log(
      `Згадка ${i}: ${result.allowed ? "✅ Дозволено" : "❌ Заблоковано"}`
    );

    if (result.allowed) {
      console.log(`   - Залишилось згадок: ${result.remaining}`);
    } else {
      const resetTimeSeconds = Math.ceil(
        (result.resetTime - Date.now()) / 1000
      );
      console.log(`   - Час до скидання: ${resetTimeSeconds}с`);
    }
  }

  console.log();
}

async function testAdminExemption() {
  console.log("👑 === Тестування винятку для адмінів ===");

  // Перевіряємо чи адмін дійсно звільнений від обмежень
  const isTestAdminAdmin = botStateService.isAdmin(testAdminId);
  console.log(`Тестовий адмін ${testAdminId} є адміном: ${isTestAdminAdmin}`);

  if (!isTestAdminAdmin) {
    console.log("⚠️  Додаємо тестового адміна до конфігурації...");
    // Тимчасово додаємо до списку адмінів
    const originalIsAdmin = botStateService.isAdmin;
    botStateService.isAdmin = function (userId) {
      return userId === testAdminId || originalIsAdmin.call(this, userId);
    };
  }

  // Для адмінів не повинно бути обмежень
  console.log("Пошукові запити адміна:");
  for (let i = 1; i <= 5; i++) {
    const result = throttleService.canMakeSearchQuery(testAdminId);
    console.log(
      `Запит ${i}: ${result.allowed ? "✅ Необмежений доступ" : "❌ Обмежено"}`
    );
  }

  console.log("\nЗгадки адміна:");
  for (let i = 1; i <= 5; i++) {
    const result = throttleService.canMentionGryag(testAdminId);
    console.log(
      `Згадка ${i}: ${result.allowed ? "✅ Необмежений доступ" : "❌ Обмежено"}`
    );
  }

  console.log();
}

async function testCleanupAndStats() {
  console.log("📊 === Статистика троттлінгу ===");

  const stats = throttleService.getStats();
  console.log("Активні обмеження:");
  console.log(
    `- Пошукові запити: ${stats.activeSearchThrottling} користувачів`
  );
  console.log(`- Згадки Гряга: ${stats.activeGryagMentions} користувачів`);
  console.log(`- Загальні повідомлення: ${stats.activeUsers} користувачів`);
  console.log(`- Чати: ${stats.activeChats} чатів`);
  console.log(`- Ліміти швидкості: ${stats.activeRateLimits} користувачів`);

  console.log("\n🧹 Тестування очищення данних...");
  throttleService.cleanup();
  console.log("✅ Очищення виконано успішно");

  // Отримуємо нову статистику після очищення
  const statsAfterCleanup = throttleService.getStats();
  console.log("Статистика після очищення:");
  console.log(
    `- Пошукові запити: ${statsAfterCleanup.activeSearchThrottling} користувачів`
  );
  console.log(
    `- Згадки Гряга: ${statsAfterCleanup.activeGryagMentions} користувачів`
  );

  console.log();
}

async function runTests() {
  try {
    await testSearchThrottling();
    await testMentionThrottling();
    await testAdminExemption();
    await testCleanupAndStats();

    console.log("🎉 Всі тести завершено!");
    console.log("\n📝 Примітки:");
    console.log("- Пошукові запити: 3 на годину на користувача");
    console.log("- Згадки Гряга: 3 на хвилину на користувача");
    console.log("- Адміни мають необмежений доступ");
    console.log(
      "- При перевищенні лімітів бот мовчить (не відправляє повідомлення)"
    );
  } catch (error) {
    console.error("❌ Помилка тестування:", error);
  }
}

// Додаємо тестових адмінів ВІДРАЗУ
const config = require("./config/bot");
const originalAdminIds = [...config.adminIds];
config.adminIds.push(testAdminId);

runTests().finally(() => {
  // Відновлюємо оригінальних адмінів
  config.adminIds = originalAdminIds;
});
