// Тест повної пошукової функціональності
const searchService = require("./src/bot/services/search");

async function testSearch() {
  console.log("🧪 Тестування повної пошукової функціональності...\n");

  // Тест 1: Витягування запиту
  console.log("1️⃣ Тест витягування запитів:");
  const testMessages = [
    "гряг знайди інфу про житомир",
    "пошукай новини про україну",
    "що відомо про харків",
  ];

  testMessages.forEach((msg) => {
    const extracted = searchService.extractSearchQuery(msg);
    console.log(`   "${msg}" → "${extracted}"`);
  });

  console.log("\n2️⃣ Тест реального пошуку:");

  try {
    // Тест DuckDuckGo пошуку
    console.log("   🦆 Тестуємо DuckDuckGo...");
    const ddgResults = await searchService.searchWeb("Житомир новини", {
      limit: 2,
    });
    console.log(`   ✅ DuckDuckGo: знайдено ${ddgResults.length} результатів`);

    if (ddgResults.length > 0) {
      console.log(`   📰 Перший результат: ${ddgResults[0].title}`);
    }

    // Тест Wikipedia пошуку
    console.log("\n   📚 Тестуємо Wikipedia...");
    const wikiResults = await searchService.searchWikipedia("Ukraine");
    console.log(`   ✅ Wikipedia: знайдено ${wikiResults.length} результатів`);

    if (wikiResults.length > 0) {
      console.log(`   📖 Перший результат: ${wikiResults[0].title}`);
    }

    console.log("\n3️⃣ Тест тригерів пошуку:");
    const triggerTests = [
      "що відомо про київ",
      "останні новини житомира",
      "розкажи про харків",
      "пошукай інформацію про одесу",
    ];

    triggerTests.forEach((text) => {
      const shouldTrigger = searchService.shouldTriggerSearch(text);
      console.log(`   "${text}" → ${shouldTrigger ? "✅ тригер" : "❌ ні"}`);
    });

    console.log("\n🎉 Всі тести завершено успішно!");
  } catch (error) {
    console.error("❌ Помилка при тестуванні:", error.message);
  }
}

// Запуск тестів
testSearch();
