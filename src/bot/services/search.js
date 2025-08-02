const fetch = require("node-fetch");

class SearchService {
  constructor() {
    this.duckDuckGoUrl = "https://api.duckduckgo.com/";
    this.serpApiUrl = "https://serpapi.com/search.json";
    this.googleSearchUrl = "https://www.googleapis.com/customsearch/v1";
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 хвилин кеш
  }

  async duckDuckGoInstant(query) {
    try {
      const cacheKey = `ddg_${query}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log("🎯 використовую кешовані результати ddg");
        return cached.data;
      }

      console.log("🔍 шукаю в duckduckgo:", query);

      const params = new URLSearchParams({
        q: query,
        format: "json",
        no_html: "1",
        skip_disambig: "1",
        no_redirect: "1",
      });

      const response = await fetch(`${this.duckDuckGoUrl}?${params}`, {
        headers: {
          "User-Agent": "gryag-bot/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`ddg api error: ${response.status}`);
      }

      const data = await response.json();

      const result = {
        abstract: data.Abstract || null,
        abstractText: data.AbstractText || null,
        abstractSource: data.AbstractSource || null,
        abstractURL: data.AbstractURL || null,
        definition: data.Definition || null,
        definitionSource: data.DefinitionSource || null,
        definitionURL: data.DefinitionURL || null,
        answer: data.Answer || null,
        answerType: data.AnswerType || null,
        relatedTopics: (data.RelatedTopics || []).slice(0, 3).map((topic) => ({
          text: topic.Text,
          firstURL: topic.FirstURL,
        })),
        infobox: data.Infobox || null,
      };

      // кешуємо результат
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error("❌ ddg search error:", error);
      return null;
    }
  }

  async googleSearch(query, options = {}) {
    try {
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

      if (!apiKey || !searchEngineId) {
        console.log("⚠️ Google Search API ключі не налаштовані");
        return null;
      }

      const cacheKey = `google_${query}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log("🎯 використовую кешовані результати google");
        return cached.data;
      }

      console.log("🔍 шукаю в google:", query);

      const params = new URLSearchParams({
        key: apiKey,
        cx: searchEngineId,
        q: query,
        num: options.limit || 5,
        lr: "lang_uk|lang_en", // українська та англійська
        safe: "active",
      });

      const response = await fetch(`${this.googleSearchUrl}?${params}`);

      if (!response.ok) {
        throw new Error(
          `Google API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        console.log("📭 google не знайшов результатів");
        return [];
      }

      const results = data.items.map((item) => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link,
        displayLink: item.displayLink,
        type: "google",
      }));

      // кешуємо результат
      this.cache.set(cacheKey, {
        data: results,
        timestamp: Date.now(),
      });

      console.log(`✅ google знайшов ${results.length} результатів`);
      return results;
    } catch (error) {
      console.error("❌ google search error:", error);
      return null;
    }
  }

  async searchWeb(query, options = {}) {
    try {
      // 1. Спочатку пробуємо Google Search (найкращі результати)
      const googleResults = await this.googleSearch(query, options);
      if (googleResults && googleResults.length > 0) {
        return googleResults;
      }

      // 2. Якщо Google не працює, пробуємо DuckDuckGo instant answer
      const instantResult = await this.duckDuckGoInstant(query);
      if (
        instantResult &&
        (instantResult.abstract ||
          instantResult.definition ||
          instantResult.answer)
      ) {
        return this.formatInstantResult(instantResult);
      }

      // 3. Пробуємо Wikipedia
      const wikiResult = await this.searchWikipedia(query);
      if (wikiResult && wikiResult.length > 0) {
        return wikiResult;
      }

      // 4. Останній fallback - HTML search з DuckDuckGo
      return await this.htmlSearch(query, options);
    } catch (error) {
      console.error("❌ web search error:", error);
      return null;
    }
  }

  async searchWikipedia(query) {
    try {
      console.log("📚 шукаю в wikipedia:", query);

      // перекладаємо запит для кращих результатів
      const searchQuery =
        query.includes("ukraine") || query.includes("україн")
          ? query
          : `${query} ukraine`; // додаємо ukraine для українського контексту

      const searchUrl = `https://uk.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchQuery)}`;

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "gryag-bot/1.0 (https://github.com/user/gryag-bot)",
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.extract && data.extract.length > 20) {
          return [
            {
              title: `📚 ${data.title}`,
              snippet: data.extract,
              link:
                data.content_urls?.desktop?.page ||
                `https://uk.wikipedia.org/wiki/${encodeURIComponent(data.title)}`,
              displayLink: "uk.wikipedia.org",
              type: "wikipedia",
            },
          ];
        }
      }

      // якщо український wiki не дав результатів, пробуємо англійський
      const enSearchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;

      const enResponse = await fetch(enSearchUrl, {
        headers: {
          "User-Agent": "gryag-bot/1.0 (https://github.com/user/gryag-bot)",
          Accept: "application/json",
        },
      });

      if (enResponse.ok) {
        const enData = await enResponse.json();

        if (enData.extract && enData.extract.length > 20) {
          return [
            {
              title: `📚 ${enData.title}`,
              snippet: enData.extract,
              link:
                enData.content_urls?.desktop?.page ||
                `https://en.wikipedia.org/wiki/${encodeURIComponent(enData.title)}`,
              displayLink: "en.wikipedia.org",
              type: "wikipedia",
            },
          ];
        }
      }

      return null;
    } catch (error) {
      console.error("❌ wikipedia search error:", error);
      return null;
    }
  }

  async htmlSearch(query, options = {}) {
    try {
      console.log("🌐 html search для:", query);

      // спробуємо різні варіанти запиту для кращих результатів
      const searchVariants = [
        query,
        `${query} 2025`,
        `${query} україна`,
        `${query} новини сьогодні`,
      ];

      for (const searchQuery of searchVariants) {
        const instantResult = await this.duckDuckGoInstant(searchQuery);

        if (
          instantResult &&
          (instantResult.abstract ||
            instantResult.definition ||
            instantResult.answer)
        ) {
          console.log("✅ знайдено instant результат для:", searchQuery);
          return this.formatInstantResult(instantResult);
        }
      }

      // якщо нічого не знайшли, повертаємо базовий результат
      console.log(
        "⚠️ не знайдено детальної інформації, повертаю базовий результат"
      );

      return [
        {
          title: `Інформація про: ${query}`,
          snippet: `На жаль, не вдалося знайти детальну інформацію про "${query}". Спробуйте більш конкретний запит або скористайтеся командою /search з іншими ключовими словами.`,
          link: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          displayLink: "duckduckgo.com",
          type: "fallback",
        },
      ];
    } catch (error) {
      console.error("❌ html search error:", error);
      return null;
    }
  }

  formatInstantResult(result) {
    const formatted = [];

    if (result.answer) {
      formatted.push({
        title: "💡 Пряма відповідь",
        snippet: result.answer,
        link: result.abstractURL || "#",
        displayLink: "duckduckgo.com",
        type: "answer",
      });
    }

    if (result.definition) {
      formatted.push({
        title: "📖 Визначення",
        snippet: result.definition,
        link: result.definitionURL || "#",
        displayLink: result.definitionSource || "duckduckgo.com",
        type: "definition",
      });
    }

    if (result.abstract && result.abstract.length > 10) {
      formatted.push({
        title: `ℹ️ ${result.abstractSource || "Інформація"}`,
        snippet: result.abstract,
        link: result.abstractURL || "#",
        displayLink: result.abstractSource || "duckduckgo.com",
        type: "abstract",
      });
    }

    // додаємо пов'язані теми тільки якщо вони мають сенс
    if (result.relatedTopics && result.relatedTopics.length > 0) {
      result.relatedTopics.forEach((topic, index) => {
        if (topic.text && topic.text.length > 20 && index < 2) {
          // тільки перші 2 і якщо довші ніж 20 символів
          formatted.push({
            title: "🔗 Пов'язана тема",
            snippet: topic.text,
            link: topic.firstURL || "#",
            displayLink: "duckduckgo.com",
            type: "related",
          });
        }
      });
    }

    // якщо є infobox, додаємо його теж
    if (
      result.infobox &&
      result.infobox.content &&
      result.infobox.content.length > 0
    ) {
      const infoboxContent = result.infobox.content
        .slice(0, 3)
        .map((item) => `${item.label}: ${item.value}`)
        .join("; ");

      if (infoboxContent.length > 10) {
        formatted.push({
          title: "📊 Додаткова інформація",
          snippet: infoboxContent,
          link: result.infobox.meta?.[0]?.value || "#",
          displayLink: "duckduckgo.com",
          type: "infobox",
        });
      }
    }

    return formatted.length > 0 ? formatted : null;
  }

  async factCheck(claim) {
    console.log("✅ фактчек для:", claim);

    // спеціальні запити для фактчекінгу
    const factCheckQueries = [
      `${claim} fact check`,
      `${claim} правда чи брехня`,
      `${claim} stopfake voxukraine`,
      `"${claim}" фактчек`,
    ];

    const results = [];

    for (const query of factCheckQueries) {
      const result = await this.searchWeb(query, { limit: 2 });
      if (result && result.length > 0) {
        results.push(...result);
      }

      // невеличка затримка між запитами
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // видаляємо дублікати
    const uniqueResults = results.filter(
      (result, index, self) =>
        index === self.findIndex((r) => r.title === result.title)
    );

    return uniqueResults.slice(0, 5); // топ 5 результатів
  }

  async getNewsUpdate(topic = "україна новини") {
    console.log("📰 новини для:", topic);

    const newsQuery = `${topic} сьогодні новини 2025`;
    return await this.searchWeb(newsQuery, { limit: 5 });
  }

  shouldTriggerSearch(text) {
    const searchTriggers = [
      "що сталося",
      "останні новини",
      "новини",
      "фактчек",
      "перевір",
      "це правда",
      "чи це так",
      "актуальна інформація",
      "пошукай",
      "знайди інформацію",
      "що про це відомо",
      "що відомо про",
      "що відомо",
      "розкажи про",
      "інформація про",
      "дізнайся про",
      "fact check",
      "is it true",
      "latest news",
      "search for",
      "find information",
      "tell me about",
      "what about",
      // нові тригери для новин міст
      "новини житомира",
      "новини києва",
      "новини львова",
      "новини одеси",
      "новини харкова",
      "новини дніпра",
      "що відбувається в",
      "ситуація в",
    ];

    const lowerText = text.toLowerCase();
    return searchTriggers.some((trigger) => lowerText.includes(trigger));
  }

  shouldTriggerFactCheck(text) {
    const factCheckTriggers = [
      "правда чи брехня",
      "фактчек",
      "це правда",
      "перевір факт",
      "fact check",
      "is it true",
      "verify",
      "check this",
    ];

    const lowerText = text.toLowerCase();
    return factCheckTriggers.some((trigger) => lowerText.includes(trigger));
  }

  // витягування пошукового запиту з повідомлення
  extractSearchQuery(text) {
    // видаляємо "гряг" та варіації на початку
    let cleanText = text.replace(/^(гряг|gryag)\s*,?\s*/i, "").trim();

    // шаблони для витягування запиту після тригерів
    const patterns = [
      // українські патерни
      /(?:пошукай|знайди)(?:\s+(?:інформацію|інфу|дані))?(?:\s+про)?\s+(.+)/i,
      /(?:що(?:\s+про)?\s*(?:це\s+)?відомо(?:\s+про)?)\s+(.+)/i,
      /(?:розкажи(?:\s+(?:мені|нам))?(?:\s+про)?)\s+(.+)/i,
      /(?:інформація(?:\s+про)?)\s+(.+)/i,
      /(?:дізнайся(?:\s+про)?)\s+(.+)/i,
      /(?:останні\s+)?новини(?:\s+про)?\s+(.+)/i,
      /(?:що\s+сталося(?:\s+(?:з|в|у))?)\s+(.+)/i,
      /(?:ситуація(?:\s+(?:в|у|з))?)\s+(.+)/i,
      /(?:що\s+відбувається(?:\s+(?:в|у|з))?)\s+(.+)/i,
      /(?:що\s+там(?:\s+з)?)\s+(.+)/i,
      /(?:перевір|фактчек)(?:\s+(?:інформацію\s+)?про)?\s+(.+)/i,
      /можеш\s+(?:знайти|пошукати)(?:\s+(?:останні\s+)?(?:новини|інформацію))?(?:\s+про)?\s+(.+)/i,
      /шукай(?:\s+(?:інформацію|дані))?(?:\s+про)?\s+(.+)/i,

      // англійські патерни
      /(?:search(?:\s+for)?|find(?:\s+(?:info|information))?(?:\s+about)?)\s+(.+)/i,
      /(?:tell\s+me\s+about|what\s+about)\s+(.+)/i,
      /(?:latest\s+)?news(?:\s+about)?\s+(.+)/i,
      /(?:fact\s+check|is\s+it\s+true)(?:\s+about)?\s+(.+)/i,
      /(?:verify|check)(?:\s+about)?\s+(.+)/i,
    ];

    // пробуємо знайти збіг з патернами
    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]) {
        // очищуємо результат від зайвих символів
        return match[1].trim().replace(/[?!.]*$/, "");
      }
    }

    // додаткова обробка для складніших випадків
    // видаляємо загальні слова на початку
    const wordsToRemove = [
      "можеш",
      "можешь",
      "можете",
      "будь ласка",
      "please",
      "скажи",
      "покажи",
      "расскажи",
      "tell",
      "show",
    ];

    for (const word of wordsToRemove) {
      const regex = new RegExp(`^${word}\\s+`, "i");
      cleanText = cleanText.replace(regex, "");
    }

    // якщо нічого не знайдено, повертаємо очищений текст
    return cleanText || text;
  }

  // очищення кешу
  clearCache() {
    this.cache.clear();
    console.log("🗑️ кеш search service очищено");
  }

  // автоочищення старого кешу
  cleanOldCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}

module.exports = new SearchService();
