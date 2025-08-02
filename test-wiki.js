const searchService = require("./src/bot/services/search");

async function testWikipedia() {
  console.log("📚 тест wikipedia...\n");

  const testQueries = [
    "Володимир Зеленський",
    "Volodymyr Zelenskyy",
    "Ukraine",
    "Житомир",
    "Київ",
    "artificial intelligence",
  ];

  for (const query of testQueries) {
    console.log(`\n📝 тестую: "${query}"`);
    try {
      const result = await searchService.searchWikipedia(query);
      if (result && result.length > 0) {
        console.log("✅ знайдено:", result[0].title);
        console.log("   текст:", result[0].snippet.substring(0, 100) + "...");
      } else {
        console.log("❌ не знайдено");
      }
    } catch (error) {
      console.log("❌ помилка:", error.message);
    }
  }
}

testWikipedia().catch(console.error);
