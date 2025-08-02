const searchService = require("./src/bot/services/search");

console.log("Тест тригерів:");
console.log(
  "що відомо про київ:",
  searchService.shouldTriggerSearch("що відомо про київ")
);
console.log(
  "розкажи про харків:",
  searchService.shouldTriggerSearch("розкажи про харків")
);
console.log(
  "пошукай інформацію:",
  searchService.shouldTriggerSearch("пошукай інформацію про одесу")
);
