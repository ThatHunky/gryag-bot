// Тест витягування пошукових запитів
const searchService = require("./src/bot/services/search");

console.log("🧪 Тестування витягування пошукових запитів...\n");

const testCases = [
  // Українські тести
  "гряг знайди інфу про житомир",
  "гряг, пошукай інформацію про київ",
  "що відомо про харків",
  "розкажи про львів",
  "інформація про одесу",
  "дізнайся про дніпро",
  "останні новини про україну",
  "що сталося в донецьку",
  "ситуація в маріуполі",
  "що відбувається в запоріжжі",
  "перевір інформацію про пожежу",
  "фактчек про вибори",

  // Англійські тести
  "search for kyiv",
  "find information about ukraine",
  "tell me about lviv",
  "what about kharkiv",
  "latest news about odesa",
  "fact check election results",
  "verify covid statistics",

  // Складніші випадки
  "гряг, можеш знайти останні новини про ситуацію на фронті?",
  "шукай інформацію про нові санкції проти росії",
  "що там з погодою в києві?",
  "гряг пошукай про новий закон",
];

console.log("Тестові запити та результати витягування:\n");

testCases.forEach((testCase, index) => {
  const extracted = searchService.extractSearchQuery(testCase);
  console.log(`${index + 1}. Оригінал: "${testCase}"`);
  console.log(`   Витягнуто: "${extracted}"`);
  console.log("");
});

console.log("✅ Тестування завершено!");
