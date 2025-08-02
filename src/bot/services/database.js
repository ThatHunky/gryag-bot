const sqlite3 = require("sqlite3").verbose();
const path = require("path");

class DatabaseService {
  constructor() {
    this.dbPath =
      process.env.DB_PATH || path.join(__dirname, "../../../data/bot.db");
    this.db = null;
    this.init();
  }

  async init() {
    try {
      // Ensure data directory exists
      const fs = require("fs");
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Initialize database
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error("❌ Database connection error:", err);
        } else {
          console.log("✅ Connected to SQLite database");
          this.createTables();
        }
      });
    } catch (error) {
      console.error("❌ Database initialization error:", error);
    }
  }

  createTables() {
    // Chat messages with embeddings
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        first_name TEXT,
        last_name TEXT,
        username TEXT,
        message_text TEXT,
        message_type TEXT DEFAULT 'text',
        media_caption TEXT,
        embedding BLOB,
        timestamp INTEGER NOT NULL,
        reply_to_message_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index for faster searches
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_chat_timestamp
      ON chat_messages(chat_id, timestamp)
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_messages
      ON chat_messages(user_id, chat_id)
    `);

    // Chat settings and metadata
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chat_settings (
        chat_id INTEGER PRIMARY KEY,
        chat_type TEXT,
        title TEXT,
        enable_semantic_search BOOLEAN DEFAULT 1,
        max_context_days INTEGER DEFAULT 30,
        language TEXT DEFAULT 'uk',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User preferences
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        language TEXT DEFAULT 'uk',
        enable_context_memory BOOLEAN DEFAULT 1,
        privacy_mode BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Database tables created/verified");
  }

  // Save message with embedding
  async saveMessage(messageData) {
    return new Promise((resolve, reject) => {
      const {
        chatId,
        userId,
        firstName,
        lastName,
        username,
        messageText,
        messageType = "text",
        mediaCaption = null,
        embedding = null,
        timestamp,
        replyToMessageId = null,
      } = messageData;

      const embeddingBlob = embedding
        ? Buffer.from(JSON.stringify(embedding))
        : null;

      this.db.run(
        `
        INSERT INTO chat_messages
        (chat_id, user_id, first_name, last_name, username, message_text,
         message_type, media_caption, embedding, timestamp, reply_to_message_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          chatId,
          userId,
          firstName,
          lastName,
          username,
          messageText,
          messageType,
          mediaCaption,
          embeddingBlob,
          timestamp,
          replyToMessageId,
        ],
        function (err) {
          if (err) {
            console.error("❌ Error saving message:", err);
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  // Get recent messages for context
  async getRecentMessages(chatId, limit = 20, maxDays = 30) {
    return new Promise((resolve, reject) => {
      const maxTimestamp = Date.now() - maxDays * 24 * 60 * 60 * 1000;

      this.db.all(
        `
        SELECT * FROM chat_messages
        WHERE chat_id = ? AND timestamp > ?
        ORDER BY timestamp DESC
        LIMIT ?
      `,
        [chatId, maxTimestamp, limit],
        (err, rows) => {
          if (err) {
            console.error("❌ Error getting recent messages:", err);
            reject(err);
          } else {
            resolve(rows.reverse()); // Return in chronological order
          }
        }
      );
    });
  }

  // Get messages with embeddings for similarity search
  async getMessagesWithEmbeddings(chatId, maxDays = 30) {
    return new Promise((resolve, reject) => {
      const maxTimestamp = Date.now() - maxDays * 24 * 60 * 60 * 1000;

      this.db.all(
        `
        SELECT id, message_text, media_caption, embedding, timestamp, user_id, first_name, username
        FROM chat_messages
        WHERE chat_id = ? AND embedding IS NOT NULL AND timestamp > ?
        ORDER BY timestamp DESC
      `,
        [chatId, maxTimestamp],
        (err, rows) => {
          if (err) {
            console.error("❌ Error getting messages with embeddings:", err);
            reject(err);
          } else {
            // Parse embeddings from BLOB
            const parsedRows = rows.map((row) => ({
              ...row,
              embedding: row.embedding
                ? JSON.parse(row.embedding.toString())
                : null,
            }));
            resolve(parsedRows);
          }
        }
      );
    });
  }

  // Update message with embedding
  async updateMessageEmbedding(messageId, embedding) {
    return new Promise((resolve, reject) => {
      const embeddingBlob = Buffer.from(JSON.stringify(embedding));

      this.db.run(
        `
        UPDATE chat_messages
        SET embedding = ?
        WHERE id = ?
      `,
        [embeddingBlob, messageId],
        function (err) {
          if (err) {
            console.error("❌ Error updating message embedding:", err);
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  // Get chat statistics
  async getChatStats(chatId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `
        SELECT
          COUNT(*) as total_messages,
          COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as messages_with_embeddings,
          MIN(timestamp) as first_message_time,
          MAX(timestamp) as last_message_time,
          COUNT(DISTINCT user_id) as unique_users
        FROM chat_messages
        WHERE chat_id = ?
      `,
        [chatId],
        (err, row) => {
          if (err) {
            console.error("❌ Error getting chat stats:", err);
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // Get chat statistics
  async getChatStatistics(chatId = null) {
    return new Promise((resolve, reject) => {
      let query;
      let params = [];

      if (chatId) {
        query = `
          SELECT 
            COUNT(*) as total_messages,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as messages_with_embeddings,
            MIN(timestamp) as oldest_message,
            MAX(timestamp) as newest_message
          FROM chat_messages 
          WHERE chat_id = ?
        `;
        params = [chatId];
      } else {
        query = `
          SELECT 
            COUNT(*) as total_messages,
            COUNT(DISTINCT chat_id) as unique_chats,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as messages_with_embeddings,
            MIN(timestamp) as oldest_message,
            MAX(timestamp) as newest_message
          FROM chat_messages
        `;
      }

      this.db.get(query, params, (err, row) => {
        if (err) {
          console.error("❌ Error getting chat statistics:", err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Clean old messages (for privacy and storage management)
  async cleanOldMessages(maxDays = 90) {
    return new Promise((resolve, reject) => {
      const maxTimestamp = Date.now() - maxDays * 24 * 60 * 60 * 1000;

      this.db.run(
        `
        DELETE FROM chat_messages
        WHERE timestamp < ?
      `,
        [maxTimestamp],
        function (err) {
          if (err) {
            console.error("❌ Error cleaning old messages:", err);
            reject(err);
          } else {
            console.log(`🧹 Cleaned ${this.changes} old messages`);
            resolve(this.changes);
          }
        }
      );
    });
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error("❌ Error closing database:", err);
        } else {
          console.log("✅ Database connection closed");
        }
      });
    }
  }
}

module.exports = new DatabaseService();
