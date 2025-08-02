const searchService = require("./src/bot/services/search");

async function testSimpleSearch() {
  console.log("🧪 простий тест search...\n");

  // тест англійського запиту
  console.log("📝 тест англійського запиту");
  try {
    const results = await searchService.duckDuckGoInstant("weather today");
    console.log("weather результат:", JSON.stringify(results, null, 2));
  } catch (error) {
    console.log("❌ помилка:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // тест математичного запиту
  console.log("📝 тест математичного запиту");
  try {
    const results = await searchService.duckDuckGoInstant("2+2");
    console.log("математика результат:", JSON.stringify(results, null, 2));
  } catch (error) {
    console.log("❌ помилка:", error.message);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // тест загального запиту
  console.log("📝 тест загального запиту");
  try {
    const results = await searchService.searchWeb("Ukraine president");
    console.log("ukraine president результат:", results);
  } catch (error) {
    console.log("❌ помилка:", error.message);
  }
}

testSimpleSearch().catch(console.error);
