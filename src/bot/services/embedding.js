const { GoogleGenerativeAI } = require("@google/generative-ai");
const databaseService = require("./database");

class EmbeddingService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Використовуємо модель для embeddings
    this.embeddingModel = this.genAI.getGenerativeModel({
      model: "text-embedding-004",
    });

    // Кеш для embeddings щоб не робити зайві запити
    this.embeddingCache = new Map();
    this.maxCacheSize = 1000;
  }

  // Створити embedding для тексту
  async createEmbedding(text) {
    if (!text || text.trim().length === 0) {
      return null;
    }

    // Перевіряємо кеш
    const cacheKey = this.hashText(text);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey);
    }

    try {
      const result = await this.embeddingModel.embedContent(text);
      const embedding = result.embedding.values;

      // Додаємо до кешу
      this.addToCache(cacheKey, embedding);

      return embedding;
    } catch (error) {
      console.error("❌ Error creating embedding:", error);
      return null;
    }
  }

  // Обробити нове повідомлення - створити embedding і зберегти
  async processMessage(messageData) {
    const { messageText, mediaCaption } = messageData;

    // Створюємо текст для embedding (повідомлення + опис медіа якщо є)
    let textForEmbedding = messageText || "";
    if (mediaCaption) {
      textForEmbedding += ` ${mediaCaption}`;
    }

    if (textForEmbedding.trim().length === 0) {
      return null;
    }

    // Створюємо embedding
    const embedding = await this.createEmbedding(textForEmbedding);

    if (embedding) {
      // Зберігаємо повідомлення з embedding до бази
      const messageId = await databaseService.saveMessage({
        ...messageData,
        embedding,
      });

      return messageId;
    } else {
      // Зберігаємо без embedding
      return await databaseService.saveMessage(messageData);
    }
  }

  // Семантичний пошук релевантних повідомлень
  async searchSimilarMessages(
    chatId,
    queryText,
    limit = 5,
    similarityThreshold = 0.5
  ) {
    try {
      // Створюємо embedding для запиту
      const queryEmbedding = await this.createEmbedding(queryText);
      if (!queryEmbedding) {
        return [];
      }

      // Отримуємо всі повідомлення з embeddings з цього чату
      const messages = await databaseService.getMessagesWithEmbeddings(chatId);

      if (messages.length === 0) {
        return [];
      }

      // Рахуємо схожість для кожного повідомлення
      const similarities = messages.map((message) => {
        const similarity = this.cosineSimilarity(
          queryEmbedding,
          message.embedding
        );
        return {
          ...message,
          similarity,
        };
      });

      // Фільтруємо за порогом і сортуємо за схожістю
      const relevantMessages = similarities
        .filter((msg) => msg.similarity >= similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return relevantMessages;
    } catch (error) {
      console.error("❌ Error in semantic search:", error);
      return [];
    }
  }

  // Автоматично знайти релевантний контекст для відповіді
  async findRelevantContext(chatId, currentMessage, limit = 3) {
    try {
      const relevantMessages = await this.searchSimilarMessages(
        chatId,
        currentMessage,
        limit,
        0.3 // Нижчий поріг для більш широкого контексту
      );

      if (relevantMessages.length === 0) {
        return "";
      }

      // Форматуємо знайдений контекст
      const contextParts = relevantMessages.map((msg) => {
        const author = msg.username ? `@${msg.username}` : msg.first_name;
        const timeAgo = this.formatTimeAgo(msg.timestamp);
        const similarity = (msg.similarity * 100).toFixed(1);

        return `${author} (${timeAgo}, схожість: ${similarity}%): ${msg.message_text}`;
      });

      return `\n📚 Релевантний контекст з історії:\n${contextParts.join("\n")}\n`;
    } catch (error) {
      console.error("❌ Error finding relevant context:", error);
      return "";
    }
  }

  // Косинусна схожість між двома векторами
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Хеш функція для кешування
  hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  // Додати до кешу з обмеженням розміру
  addToCache(key, value) {
    if (this.embeddingCache.size >= this.maxCacheSize) {
      // Видаляємо найстарший елемент
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }
    this.embeddingCache.set(key, value);
  }

  // Форматування часу
  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days} дн. тому`;
    } else if (hours > 0) {
      return `${hours} год. тому`;
    } else if (minutes > 0) {
      return `${minutes} хв. тому`;
    } else {
      return "щойно";
    }
  }

  // Очистити кеш
  clearCache() {
    this.embeddingCache.clear();
  }

  // Статистика кешу
  getCacheStats() {
    return {
      size: this.embeddingCache.size,
      maxSize: this.maxCacheSize,
      usage:
        ((this.embeddingCache.size / this.maxCacheSize) * 100).toFixed(1) + "%",
    };
  }
}

module.exports = new EmbeddingService();
