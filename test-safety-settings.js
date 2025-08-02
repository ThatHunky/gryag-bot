// Тест нових налаштувань безпеки Gemini
const geminiService = require("./src/bot/services/gemini");

async function testSafetySettings() {
  console.log("🧪 Тестування нових налаштувань безпеки Gemini...\n");

  // Тест звичайного запиту
  console.log("1️⃣ Тест звичайного запиту:");
  try {
    const context = {
      userId: 123,
      userName: "TestUser",
      chatId: 456,
    };

    const response = await geminiService.generateResponse(
      "Привіт! Як справи?",
      context
    );
    console.log("✅ Звичайний запит:", response.substring(0, 100) + "...");
  } catch (error) {
    console.log("❌ Помилка:", error.message);
  }

  // Тест з потенційно проблемним контентом
  console.log("\n2️⃣ Тест з потенційно проблемним контентом:");
  try {
    const context = {
      userId: 123,
      userName: "TestUser",
      chatId: 456,
    };

    const response = await geminiService.generateResponse(
      "Розкажи про конфлікти та війни",
      context
    );
    console.log("✅ Проблемний контент:", response.substring(0, 100) + "...");
  } catch (error) {
    console.log("❌ Помилка:", error.message);
  }

  // Тест з політичним контентом
  console.log("\n3️⃣ Тест з політичним контентом:");
  try {
    const context = {
      userId: 123,
      userName: "TestUser",
      chatId: 456,
    };

    const response = await geminiService.generateResponse(
      "Що думаєш про політику?",
      context
    );
    console.log("✅ Політичний контент:", response.substring(0, 100) + "...");
  } catch (error) {
    console.log("❌ Помилка:", error.message);
  }

  console.log("\n🎉 Тестування завершено!");
}

testSafetySettings();
