# Expert Telegram Bot Development Instructions

## Table of Contents
1. [Project Setup](#project-setup)
2. [Environment Configuration](#environment-configuration)
3. [Bot Architecture](#bot-architecture)
4. [Core Implementation](#core-implementation)
5. [Advanced Features](#advanced-features)
6. [Testing & Debugging](#testing--debugging)
7. [Deployment](#deployment)
8. [Best Practices](#best-practices)

## Project Setup

### 1. Initialize Node.js Project
```bash
npm init -y
npm install node-telegram-bot-api dotenv
npm install --save-dev nodemon jest
```

### 2. Project Structure
```
gryag-bot/
├── src/
│   ├── bot/
│   │   ├── handlers/
│   │   │   ├── commands.js
│   │   │   ├── callbacks.js
│   │   │   └── messages.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── logging.js
│   │   │   └── rateLimit.js
│   │   ├── services/
│   │   │   ├── database.js
│   │   │   ├── api.js
│   │   │   └── utils.js
│   │   └── index.js
├── config/
│   ├── bot.js
│   └── database.js
├── tests/
├── docs/
├── .env.example
├── .env
├── .gitignore
├── package.json
└── README.md
```

### 3. Essential Dependencies
```json
{
  "dependencies": {
    "node-telegram-bot-api": "^0.64.0",
    "dotenv": "^16.0.3",
    "axios": "^1.6.0",
    "sqlite3": "^5.1.6",
    "express": "^4.18.0",
    "helmet": "^7.1.0",
    "rate-limiter-flexible": "^3.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.7.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

## Environment Configuration

### 1. Environment Variables (.env)
```env
# Bot Configuration
BOT_TOKEN=your_bot_token_here
BOT_USERNAME=your_bot_username
BOT_NAME=Your Bot Name

# Server Configuration
PORT=3000
NODE_ENV=development
WEBHOOK_URL=https://your-domain.com/webhook

# Database
DB_PATH=./data/bot.db

# API Keys
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key

# Admin Configuration
ADMIN_USER_IDS=123456789,987654321
LOG_LEVEL=info
```

### 2. Configuration Files

#### config/bot.js
```javascript
require('dotenv').config();

module.exports = {
  token: process.env.BOT_TOKEN,
  username: process.env.BOT_USERNAME,
  name: process.env.BOT_NAME,
  adminIds: process.env.ADMIN_USER_IDS?.split(',').map(id => parseInt(id)) || [],
  polling: process.env.NODE_ENV === 'development',
  webhook: {
    url: process.env.WEBHOOK_URL,
    port: process.env.PORT || 3000
  }
};
```

## Bot Architecture

### 1. Main Bot Class (src/bot/index.js)
```javascript
const TelegramBot = require('node-telegram-bot-api');
const config = require('../../config/bot');
const commandHandler = require('./handlers/commands');
const messageHandler = require('./handlers/messages');
const callbackHandler = require('./handlers/callbacks');
const authMiddleware = require('./middleware/auth');
const loggingMiddleware = require('./middleware/logging');

class GryagBot {
  constructor() {
    this.bot = new TelegramBot(config.token, { polling: config.polling });
    this.setupMiddleware();
    this.setupHandlers();
  }

  setupMiddleware() {
    // Apply middleware to all updates
    this.bot.on('message', (msg) => {
      loggingMiddleware(msg);
      authMiddleware(msg, this.bot);
    });
  }

  setupHandlers() {
    // Command handlers
    this.bot.onText(/\/start/, (msg) => commandHandler.start(msg, this.bot));
    this.bot.onText(/\/help/, (msg) => commandHandler.help(msg, this.bot));
    this.bot.onText(/\/settings/, (msg) => commandHandler.settings(msg, this.bot));

    // Message handlers
    this.bot.on('message', (msg) => messageHandler.handleMessage(msg, this.bot));

    // Callback query handlers
    this.bot.on('callback_query', (query) => callbackHandler.handleCallback(query, this.bot));
  }

  start() {
    console.log(`${config.name} started successfully!`);

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  stop() {
    console.log('Stopping bot...');
    this.bot.stopPolling();
    process.exit(0);
  }
}

module.exports = GryagBot;
```

### 2. Command Handlers (src/bot/handlers/commands.js)
```javascript
const config = require('../../../config/bot');

class CommandHandler {
  static async start(msg, bot) {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;

    const welcomeMessage = `
🎉 Welcome to ${config.name}, ${firstName}!

I'm here to help you with various tasks. Use /help to see what I can do.
    `;

    const keyboard = {
      inline_keyboard: [
        [{ text: '📋 Help', callback_data: 'help' }],
        [{ text: '⚙️ Settings', callback_data: 'settings' }]
      ]
    };

    await bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  }

  static async help(msg, bot) {
    const chatId = msg.chat.id;

    const helpMessage = `
📚 <b>Available Commands:</b>

🔹 /start - Start the bot
🔹 /help - Show this help message
🔹 /settings - Configure bot settings
🔹 /status - Check bot status

<b>Features:</b>
• Smart message processing
• Callback handling
• User management
• Rate limiting
    `;

    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'HTML' });
  }

  static async settings(msg, bot) {
    const chatId = msg.chat.id;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔔 Notifications', callback_data: 'settings_notifications' },
          { text: '🌐 Language', callback_data: 'settings_language' }
        ],
        [
          { text: '🎨 Theme', callback_data: 'settings_theme' },
          { text: '🔒 Privacy', callback_data: 'settings_privacy' }
        ],
        [{ text: '🔙 Back', callback_data: 'main_menu' }]
      ]
    };

    await bot.sendMessage(chatId, '⚙️ <b>Settings</b>\n\nChoose a category:', {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  }
}

module.exports = CommandHandler;
```

### 3. Message Handlers (src/bot/handlers/messages.js)
```javascript
class MessageHandler {
  static async handleMessage(msg, bot) {
    // Skip if it's a command
    if (msg.text && msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const messageType = this.getMessageType(msg);

    switch (messageType) {
      case 'text':
        await this.handleTextMessage(msg, bot);
        break;
      case 'photo':
        await this.handlePhotoMessage(msg, bot);
        break;
      case 'document':
        await this.handleDocumentMessage(msg, bot);
        break;
      case 'voice':
        await this.handleVoiceMessage(msg, bot);
        break;
      default:
        await this.handleUnsupportedMessage(msg, bot);
    }
  }

  static getMessageType(msg) {
    if (msg.text) return 'text';
    if (msg.photo) return 'photo';
    if (msg.document) return 'document';
    if (msg.voice) return 'voice';
    if (msg.audio) return 'audio';
    if (msg.video) return 'video';
    if (msg.sticker) return 'sticker';
    return 'unknown';
  }

  static async handleTextMessage(msg, bot) {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase();

    // Simple AI-like responses
    const responses = {
      'hello': 'Hello! How can I help you today?',
      'help': 'I\'m here to assist you. Try using /help for commands.',
      'thanks': 'You\'re welcome! 😊',
      'bye': 'Goodbye! Have a great day! 👋'
    };

    const response = responses[text] || `I received your message: "${msg.text}"`;
    await bot.sendMessage(chatId, response);
  }

  static async handlePhotoMessage(msg, bot) {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '📸 Nice photo! I can see you sent me an image.');
  }

  static async handleDocumentMessage(msg, bot) {
    const chatId = msg.chat.id;
    const fileName = msg.document.file_name;
    await bot.sendMessage(chatId, `📄 Document received: ${fileName}`);
  }

  static async handleVoiceMessage(msg, bot) {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '🎤 Voice message received! Audio processing coming soon.');
  }

  static async handleUnsupportedMessage(msg, bot) {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '❓ I don\'t understand this type of message yet.');
  }
}

module.exports = MessageHandler;
```

### 4. Callback Handlers (src/bot/handlers/callbacks.js)
```javascript
class CallbackHandler {
  static async handleCallback(query, bot) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    // Answer the callback query to remove loading state
    await bot.answerCallbackQuery(query.id);

    switch (data) {
      case 'help':
        await this.showHelp(chatId, messageId, bot);
        break;
      case 'settings':
        await this.showSettings(chatId, messageId, bot);
        break;
      case 'settings_notifications':
        await this.showNotificationSettings(chatId, messageId, bot);
        break;
      case 'settings_language':
        await this.showLanguageSettings(chatId, messageId, bot);
        break;
      case 'main_menu':
        await this.showMainMenu(chatId, messageId, bot);
        break;
      default:
        await bot.sendMessage(chatId, 'Unknown action!');
    }
  }

  static async showHelp(chatId, messageId, bot) {
    const helpMessage = `
📚 <b>Bot Help</b>

This bot can help you with:
• Message processing
• File handling
• Interactive menus
• Custom commands

Use the buttons below to navigate.
    `;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🔙 Back to Menu', callback_data: 'main_menu' }]
      ]
    };

    await bot.editMessageText(helpMessage, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  }

  static async showSettings(chatId, messageId, bot) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔔 Notifications', callback_data: 'settings_notifications' },
          { text: '🌐 Language', callback_data: 'settings_language' }
        ],
        [{ text: '🔙 Back', callback_data: 'main_menu' }]
      ]
    };

    await bot.editMessageText('⚙️ <b>Settings</b>\n\nChoose a category:', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  }

  static async showMainMenu(chatId, messageId, bot) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '📋 Help', callback_data: 'help' }],
        [{ text: '⚙️ Settings', callback_data: 'settings' }]
      ]
    };

    await bot.editMessageText('🏠 <b>Main Menu</b>\n\nWhat would you like to do?', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  }
}

module.exports = CallbackHandler;
```

## Advanced Features

### 1. Database Integration (src/bot/services/database.js)
```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(process.env.DB_PATH || './data/bot.db');
    this.init();
  }

  init() {
    this.db.serialize(() => {
      // Users table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          telegram_id INTEGER UNIQUE,
          username TEXT,
          first_name TEXT,
          last_name TEXT,
          language_code TEXT,
          is_bot INTEGER DEFAULT 0,
          is_premium INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // User settings table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          setting_key TEXT,
          setting_value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (telegram_id)
        )
      `);

      // Messages log table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS message_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          message_id INTEGER,
          message_type TEXT,
          content TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (telegram_id)
        )
      `);
    });
  }

  async saveUser(userInfo) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO users
        (telegram_id, username, first_name, last_name, language_code, is_bot, is_premium, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        userInfo.id,
        userInfo.username,
        userInfo.first_name,
        userInfo.last_name,
        userInfo.language_code,
        userInfo.is_bot ? 1 : 0,
        userInfo.is_premium ? 1 : 0
      );

      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getUserSettings(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else {
            const settings = {};
            rows.forEach(row => {
              settings[row.setting_key] = row.setting_value;
            });
            resolve(settings);
          }
        }
      );
    });
  }

  async updateUserSetting(userId, key, value) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO user_settings (user_id, setting_key, setting_value)
        VALUES (?, ?, ?)
      `);

      stmt.run(userId, key, value);
      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = new Database();
```

### 2. Rate Limiting Middleware (src/bot/middleware/rateLimit.js)
```javascript
const { RateLimiterMemory } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
  keyGenerator: (userId) => userId,
  points: 10, // Number of requests
  duration: 60, // Per 60 seconds
});

const rateLimitMiddleware = async (msg, bot) => {
  const userId = msg.from.id;

  try {
    await rateLimiter.consume(userId);
  } catch (rejRes) {
    const waitTime = Math.round(rejRes.msBeforeNext / 1000) || 1;
    await bot.sendMessage(
      msg.chat.id,
      `⚠️ Too many requests! Please wait ${waitTime} seconds.`
    );
    return false; // Block further processing
  }

  return true; // Allow processing
};

module.exports = rateLimitMiddleware;
```

### 3. Logging Middleware (src/bot/middleware/logging.js)
```javascript
const database = require('../services/database');

const loggingMiddleware = async (msg) => {
  try {
    // Save user info
    await database.saveUser(msg.from);

    // Log message
    console.log(`[${new Date().toISOString()}] User ${msg.from.id} (${msg.from.username}): ${msg.text || 'non-text message'}`);

    // Save to database if needed
    // await database.logMessage(msg.from.id, msg.message_id, getMessageType(msg), msg.text);
  } catch (error) {
    console.error('Logging error:', error);
  }
};

module.exports = loggingMiddleware;
```

## Testing & Debugging

### 1. Unit Tests (tests/handlers.test.js)
```javascript
const CommandHandler = require('../src/bot/handlers/commands');

describe('Command Handlers', () => {
  let mockBot;

  beforeEach(() => {
    mockBot = {
      sendMessage: jest.fn().mockResolvedValue({}),
      editMessageText: jest.fn().mockResolvedValue({})
    };
  });

  test('start command sends welcome message', async () => {
    const mockMsg = {
      chat: { id: 123 },
      from: { first_name: 'Test' }
    };

    await CommandHandler.start(mockMsg, mockBot);

    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Welcome to'),
      expect.any(Object)
    );
  });

  test('help command sends help message', async () => {
    const mockMsg = { chat: { id: 123 } };

    await CommandHandler.help(mockMsg, mockBot);

    expect(mockBot.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Available Commands'),
      expect.any(Object)
    );
  });
});
```

### 2. Debug Configuration
```javascript
// Add to package.json scripts
{
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "debug": "node --inspect-brk src/app.js"
  }
}
```

## Deployment

### 1. Production Setup (src/app.js)
```javascript
const express = require('express');
const helmet = require('helmet');
const GryagBot = require('./bot');
const config = require('../config/bot');

const app = express();
const bot = new GryagBot();

// Security middleware
app.use(helmet());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Webhook endpoint (for production)
if (!config.polling) {
  app.post('/webhook', (req, res) => {
    bot.bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // Set webhook
  bot.bot.setWebHook(config.webhook.url + '/webhook');
}

// Start server
app.listen(config.webhook.port, () => {
  console.log(`Server running on port ${config.webhook.port}`);
  bot.start();
});
```

### 2. Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  gryag-bot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### 3. Environment-Specific Configs
```javascript
// config/environments/production.js
module.exports = {
  polling: false,
  webhook: {
    enabled: true,
    ssl: true
  },
  database: {
    path: '/app/data/bot.db'
  },
  logging: {
    level: 'warn'
  }
};
```

## Best Practices

### 1. Error Handling
```javascript
// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Bot error handling
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});
```

### 2. Security Measures
```javascript
// Input validation
const validateInput = (text) => {
  if (!text || typeof text !== 'string') return false;
  if (text.length > 4000) return false; // Telegram limit
  return true;
};

// Admin check
const isAdmin = (userId) => {
  return config.adminIds.includes(userId);
};

// Sanitize user input
const sanitizeInput = (text) => {
  return text.replace(/<[^>]*>/g, '').trim();
};
```

### 3. Performance Optimization
```javascript
// Response caching
const responseCache = new Map();

const getCachedResponse = (key) => {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
    return cached.data;
  }
  return null;
};

const setCachedResponse = (key, data) => {
  responseCache.set(key, {
    data,
    timestamp: Date.now()
  });
};
```

### 4. Monitoring & Analytics
```javascript
// Simple analytics
const analytics = {
  messageCount: 0,
  userCount: new Set(),
  commandUsage: new Map(),

  track(event, data) {
    switch (event) {
      case 'message':
        this.messageCount++;
        this.userCount.add(data.userId);
        break;
      case 'command':
        const count = this.commandUsage.get(data.command) || 0;
        this.commandUsage.set(data.command, count + 1);
        break;
    }
  },

  getStats() {
    return {
      totalMessages: this.messageCount,
      uniqueUsers: this.userCount.size,
      topCommands: Array.from(this.commandUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    };
  }
};
```

## Getting Started Checklist

1. ✅ **Create Bot**: Message @BotFather on Telegram to create your bot
2. ✅ **Get Token**: Save the bot token from BotFather
3. ✅ **Clone Structure**: Set up the project structure shown above
4. ✅ **Install Dependencies**: Run `npm install` with required packages
5. ✅ **Configure Environment**: Set up your `.env` file with bot token
6. ✅ **Implement Handlers**: Start with basic command and message handlers
7. ✅ **Add Database**: Implement user and settings storage
8. ✅ **Test Locally**: Use polling mode for development
9. ✅ **Deploy**: Set up webhook for production deployment
10. ✅ **Monitor**: Implement logging and error handling

## Useful Commands for BotFather

```
/newbot - Create a new bot
/mybots - Manage your bots
/setcommands - Set bot commands
/setdescription - Set bot description
/setabouttext - Set about text
/setuserpic - Set bot profile picture
/setinline - Enable inline mode
/setjoingroups - Allow bot to join groups
/setprivacy - Set privacy mode
```

This comprehensive guide covers everything you need to build a professional Telegram bot. Start with the basic structure and gradually add advanced features as needed.
