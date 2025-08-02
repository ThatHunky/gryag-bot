// Тест команди search без лінків
const CommandHandler = require("./src/bot/handlers/commands");

async function testSearchWithoutLinks() {
  console.log("🧪 Тестування search команди без лінків...\n");

  // Симулюємо об'єкт повідомлення
  const mockMsg = {
    from: { id: 123, first_name: "Тест" },
    chat: { id: 456, type: "private" },
    text: "/search київ",
  };

  // Симулюємо бота
  const mockBot = {
    sendMessage: (chatId, text, options = {}) => {
      console.log("📤 Відповідь бота:");
      console.log("=".repeat(50));
      console.log(text);
      console.log("=".repeat(50));
      return Promise.resolve({ message_id: 789 });
    },
    sendChatAction: () => Promise.resolve(),
  };

  try {
    await CommandHandler.search(mockMsg, mockBot);
    console.log("✅ Тест завершено!");
  } catch (error) {
    console.error("❌ Помилка:", error.message);
  }
}

testSearchWithoutLinks();
