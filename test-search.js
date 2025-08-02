const searchService = require("./src/bot/services/search");

async function testSearch() {
  console.log("🧪 тестування search service...\n");

  // тест 1: простий пошук
  console.log("📝 тест 1: простий пошук");
  try {
    const results = await searchService.searchWeb("україна новини 2025");
    console.log("✅ результати пошуку:", results ? results.length : 0);
    if (results && results.length > 0) {
      console.log(
        "   перший результат:",
        results[0].title.substring(0, 50) + "..."
      );
    }
  } catch (error) {
    console.log("❌ помилка пошуку:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // тест 2: фактчек
  console.log("📝 тест 2: фактчекінг");
  try {
    const factResults = await searchService.factCheck(
      "вакцина проти covid безпечна"
    );
    console.log(
      "✅ результати фактчеку:",
      factResults ? factResults.length : 0
    );
    if (factResults && factResults.length > 0) {
      console.log(
        "   перший результат:",
        factResults[0].title.substring(0, 50) + "..."
      );
    }
  } catch (error) {
    console.log("❌ помилка фактчеку:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // тест 3: новини
  console.log("📝 тест 3: новини");
  try {
    const newsResults = await searchService.getNewsUpdate(
      "технології штучний інтелект"
    );
    console.log("✅ результати новин:", newsResults ? newsResults.length : 0);
    if (newsResults && newsResults.length > 0) {
      console.log(
        "   перший результат:",
        newsResults[0].title.substring(0, 50) + "..."
      );
    }
  } catch (error) {
    console.log("❌ помилка новин:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // тест 4: тригери
  console.log("📝 тест 4: тригери пошуку");
  const searchTriggers = [
    "що сталося в україні?",
    "пошукай інформацію про це",
    "fact check цю інформацію",
    "це правда чи брехня?",
    "останні новини",
    "hello world", // не має тригера
  ];

  searchTriggers.forEach((text) => {
    const needsSearch = searchService.shouldTriggerSearch(text);
    const needsFactCheck = searchService.shouldTriggerFactCheck(text);

    console.log(`   "${text}"`);
    console.log(
      `     пошук: ${needsSearch ? "✅" : "❌"}, фактчек: ${needsFactCheck ? "✅" : "❌"}`
    );
  });

  console.log("\n" + "=".repeat(50) + "\n");

  // тест 5: кеш
  console.log("📝 тест 5: кеш системи");
  console.log("   розмір кешу:", searchService.cache.size);

  // тестуємо той самий запит знову
  const cacheTestStart = Date.now();
  await searchService.searchWeb("україна новини 2025");
  const cacheTestTime = Date.now() - cacheTestStart;

  console.log("   час другого запиту (з кешу):", cacheTestTime + "ms");
  console.log("   розмір кешу після тесту:", searchService.cache.size);

  console.log("\n🎉 всі тести завершено!");
}

// запускаємо тести
testSearch().catch(console.error);
