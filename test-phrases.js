// Тестові фрази українською для перевірки бота

const ukrainianTestPhrases = [
  "Привіт! Як справи?",
  "Що нового?",
  "Можеш допомогти мені?",
  "Яка сьогодні погода?",
  "Розкажи щось цікаве",
  "Дякую за допомогу!",
  "До побачення!",
  "Допоможи мені зрозуміти це",
  "Що ти можеш робити?",
  "Поясни мені будь ласка"
];

const englishTestPhrases = [
  "Hello! How are you?",
  "What's new?",
  "Can you help me?",
  "What's the weather today?",
  "Tell me something interesting",
  "Thank you for your help!",
  "Goodbye!",
  "Help me understand this",
  "What can you do?",
  "Please explain to me"
];

// Експорт для тестування
module.exports = {
  ukrainianTestPhrases,
  englishTestPhrases
};

console.log("🇺🇦 Тестові фрази українською:");
ukrainianTestPhrases.forEach((phrase, index) => {
  console.log(`${index + 1}. ${phrase}`);
});

console.log("\n🇺🇸 Test phrases in English:");
englishTestPhrases.forEach((phrase, index) => {
  console.log(`${index + 1}. ${phrase}`);
});

console.log("\n💡 Інструкції для тестування:");
console.log("1. Додайте бота до групи");
console.log("2. Згадайте бота: @your_bot_username [фраза]");
console.log("3. Перевірте, чи відповідає бот правильною мовою");
console.log("4. Використовуйте /lang для зміни мови");
console.log("5. Відповідайте на повідомлення бота для продовження розмови");
