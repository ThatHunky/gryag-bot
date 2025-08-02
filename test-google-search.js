// Тест Google Search API
const searchService = require("./src/bot/services/search");

async function testGoogleSearch() {
  console.log("🧪 Тестування Google Search API...\n");

  // Перевіряємо чи налаштовані ключі
  const hasGoogleKeys =
    process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!hasGoogleKeys) {
    console.log("❌ Google Search API ключі не налаштовані");
    console.log("📝 Додайте в .env файл:");
    console.log("GOOGLE_SEARCH_API_KEY=your_api_key");
    console.log("GOOGLE_SEARCH_ENGINE_ID=your_engine_id");
    console.log("\n📚 Інструкція:");
    console.log(
      "1. Йдіть на https://developers.google.com/custom-search/v1/overview"
    );
    console.log("2. Створіть API ключ");
    console.log(
      "3. Налаштуйте Custom Search Engine на https://cse.google.com/"
    );
    return;
  }

  console.log("✅ Google Search API ключі знайдені");

  // Тест 1: Пошук новин
  console.log("\n1️⃣ Тест пошуку новин:");
  try {
    const newsResults = await searchService.googleSearch(
      "україна новини сьогодні",
      { limit: 3 }
    );
    console.log(
      `📰 Знайдено: ${newsResults ? newsResults.length : 0} результатів`
    );
    if (newsResults && newsResults.length > 0) {
      console.log(`📑 Перший результат: ${newsResults[0].title}`);
    }
  } catch (error) {
    console.log("❌ Помилка:", error.message);
  }

  // Тест 2: Загальний пошук
  console.log("\n2️⃣ Тест загального пошуку:");
  try {
    const generalResults = await searchService.googleSearch("житомир", {
      limit: 3,
    });
    console.log(
      `🔍 Знайдено: ${generalResults ? generalResults.length : 0} результатів`
    );
    if (generalResults && generalResults.length > 0) {
      console.log(`📑 Перший результат: ${generalResults[0].title}`);
    }
  } catch (error) {
    console.log("❌ Помилка:", error.message);
  }

  // Тест 3: Повний searchWeb з Google пріоритетом
  console.log("\n3️⃣ Тест повного searchWeb:");
  try {
    const webResults = await searchService.searchWeb("харків новини");
    console.log(
      `🌐 Знайдено: ${webResults ? webResults.length : 0} результатів`
    );
    if (webResults && webResults.length > 0) {
      console.log(`📑 Перший результат: ${webResults[0].title}`);
      console.log(`🔧 Тип: ${webResults[0].type}`);
    }
  } catch (error) {
    console.log("❌ Помилка:", error.message);
  }

  console.log("\n🎉 Тестування завершено!");
}

testGoogleSearch();
