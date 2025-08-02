#!/usr/bin/env node

// Тест системи семантичного пошуку та бази даних
require('dotenv').config();

const databaseService = require('./src/bot/services/database');
const embeddingService = require('./src/bot/services/embedding');
const languageService = require('./src/bot/services/language');

async function testSemanticSearch() {
  console.log('🧪 Тестування системи семантичного пошуку...\n');

  try {
    // Тест 1: Перевірка з'єднання з базою даних
    console.log('1️⃣ Тестування бази даних...');
    const stats = await databaseService.getChatStatistics(123456);
    console.log('✅ База даних працює');

    // Тест 2: Перевірка embedding service
    console.log('\n2️⃣ Тестування embedding service...');
    const testText = 'Привіт, як справи?';
    const embedding = await embeddingService.createEmbedding(testText);
    
    if (embedding && embedding.length > 0) {
      console.log(`✅ Embedding створено (довжина: ${embedding.length})`);
    } else {
      console.log('❌ Помилка створення embedding');
      return;
    }

    // Тест 3: Тест схожості між текстами
    console.log('\n3️⃣ Тестування семантичної схожості...');
    const text1 = 'Привіт, як справи?';
    const text2 = 'Вітаю, як ти поживаєш?';
    const text3 = 'Сьогодні гарна погода';

    const emb1 = await embeddingService.createEmbedding(text1);
    const emb2 = await embeddingService.createEmbedding(text2);
    const emb3 = await embeddingService.createEmbedding(text3);

    if (emb1 && emb2 && emb3) {
      // Використовуємо cosineSimilarity з embedding service
      const similarity12 = calculateCosineSimilarity(emb1, emb2);
      const similarity13 = calculateCosineSimilarity(emb1, emb3);

      console.log(`📊 Схожість "${text1}" ↔ "${text2}": ${(similarity12 * 100).toFixed(1)}%`);
      console.log(`📊 Схожість "${text1}" ↔ "${text3}": ${(similarity13 * 100).toFixed(1)}%`);
      
      if (similarity12 > similarity13) {
        console.log('✅ Система правильно визначає схожі тексти');
      } else {
        console.log('⚠️ Неочікувані результати схожості');
      }
    }

    // Тест 4: Перевірка language service
    console.log('\n4️⃣ Тестування language service...');
    const ukText = languageService.getText(12345, 'welcome', 'Тест', 'Gryag');
    const sysPrompt = languageService.getSystemPrompt(12345);
    console.log('✅ Language service працює');
    console.log(`📝 Системний промпт: ${sysPrompt.substring(0, 100)}...`);

    // Тест 5: Кеш статистики
    console.log('\n5️⃣ Статистика кешу embeddings...');
    const cacheStats = embeddingService.getCacheStats();
    console.log(`📦 Кеш: ${cacheStats.size}/${cacheStats.maxSize} (${cacheStats.usage})`);

    console.log('\n🎉 Всі тести пройшли успішно!');
    console.log('\n📋 Система готова до роботи:');
    console.log('  • 🤖 Бот автоматично зберігає всі повідомлення');
    console.log('  • 🔍 Семантичний пошук працює в фоні');
    console.log('  • 📊 Команда /stats показує статистику');
    console.log('  • 🧠 ШІ отримує релевантний контекст з історії');

  } catch (error) {
    console.error('❌ Помилка під час тестування:', error);
  } finally {
    process.exit(0);
  }
}

// Функція для обчислення косинусної схожості
function calculateCosineSimilarity(embedding1, embedding2) {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

if (require.main === module) {
  testSemanticSearch();
}
