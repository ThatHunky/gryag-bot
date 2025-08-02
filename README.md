# Gryag Bot

A smart Telegram group chat bot with Google Gemini AI integration, semantic search, Docker deployment, and advanced throttling system.

## ✨ Features

- 🤖 **AI-Powered Responses** - Google Gemini with contextual understanding
- 🧠 **Semantic Search** - Automatic context retrieval from conversation history
- 🐳 **Docker Deployment** - Containerized with auto-updates and health monitoring
- 🔍 **Web Search Integration** - Google Search API with fallback mechanisms
- 💬 **Group Chat Smart** - Only responds when mentioned or replied to
- 🎯 **Context Aware** - Understands conversation history and replies intelligently
- 🌍 **Multilingual** - Ukrainian (default) and English with auto-detection
- 🛡️ **Admin Controls** - Enable/disable bot, view statistics, manage settings
- � **Advanced Throttling** - Per-user limits for search queries and mentions
- 📊 **Database Storage** - SQLite with embeddings and conversation history
- 🔒 **Anti-Spam Protection** - Multi-layer throttling and rate limiting

## 🚀 Quick Start Options

### Option 1: Docker (Recommended)

```bash
# Clone repository
git clone <your-repo-url>
cd gryag-bot

# Copy and configure environment
cp .env.example .env
# Edit .env with your tokens

# Deploy with auto-updates
./deploy.sh        # Linux/macOS
# or
./deploy.ps1       # Windows PowerShell
```

### Option 2: Manual Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your tokens
BOT_TOKEN=your_bot_token_here
GEMINI_API_KEY=your_gemini_api_key_here
BOT_USERNAME=your_bot_username

# Run development mode
npm run dev
```
npm start
```

## Project Structure

```
gryag-bot/
├── src/
│   ├── bot/
│   │   ├── handlers/
│   │   │   ├── commands.js    # Command handlers (/start, /help, etc.)
│   │   │   ├── messages.js    # Message type handlers
│   │   │   └── callbacks.js   # Inline keyboard callbacks
│   │   └── index.js          # Main bot class
│   └── app.js               # Application entry point
├── config/
│   └── bot.js              # Bot configuration
├── .env.example           # Environment variables template
└── package.json
```

## Available Commands

- `/start` - Initialize the bot and show welcome message
- `/help` - Display help information and bot capabilities
- `/settings` - Open settings menu
- `/status` - Check bot status
- `/test` - Test Gemini AI connection

## How It Works in Groups

1. **Add the bot to your group**
2. **Mention the bot**: `@your_bot_username Hello, how are you?`
3. **Reply to bot messages**: The bot will continue the conversation
4. **Get AI responses**: Powered by Google Gemini for natural conversations

## Private Chat

- Send any message and get AI-powered responses
- No need to mention - just chat naturally

## Configuration

Edit your `.env` file:

```env
BOT_TOKEN=your_bot_token_here
BOT_USERNAME=your_bot_username
BOT_NAME=Your Bot Name
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_SEARCH_API_KEY=your_google_search_key # Optional
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id # Optional
NODE_ENV=development
PORT=3000
```

## 🚦 Throttling System

The bot includes advanced per-user throttling to prevent spam:

- **Search Queries**: 3 per hour per user
  - Affects `/search`, `/news`, `/factcheck`, and automatic search
  - When limit exceeded: Bot silently ignores requests

- **Gryag Mentions**: 3 per minute per user
  - Affects mentions in group chats (@username, "гряг", "gryag")
  - When limit exceeded: Bot silently ignores mentions

- **Admin Exemption**: Admins have unlimited access
- **Silent Enforcement**: No spam notifications to users

## 🐳 Docker Deployment

### Production with Auto-Updates

```bash
# Quick deploy (recommended)
./deploy.sh        # Linux/macOS
# or
./deploy.ps1       # Windows

# Manual Docker commands
docker-compose up -d

# View logs
docker-compose logs -f gryag-bot

# Update
docker-compose pull && docker-compose up -d
```

### Development Mode

```bash
# Run with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Or traditional development
npm run dev
```

### Auto-Update Features

- **Nightly Updates**: Automatically pulls from GitHub at 3:00 AM
- **Database Backup**: Creates backups before updates
- **Health Monitoring**: Automatic restart if bot becomes unhealthy
- **Cross-Platform**: Works on Linux, macOS, and Windows

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Test systems
node test-semantic-search.js
node test-throttling-system.js
node test-docker-integration.js

# Debug mode
npm run debug
```

## Adding New Features

### Add a New Command

1. Edit `src/bot/handlers/commands.js`
2. Add your command handler function
3. Register it in `src/bot/index.js`

### Add New Message Types

1. Edit `src/bot/handlers/messages.js`
2. Add handling for your message type
3. Update the `getMessageType()` function if needed

### Add New Inline Keyboard Options

1. Edit `src/bot/handlers/callbacks.js`
2. Add your callback handler
3. Update the switch statement in `handleCallback()`

## Deployment

### Using PM2

```bash
npm install -g pm2
pm2 start src/app.js --name "gryag-bot"
pm2 save
pm2 startup
```

### Using Docker

```bash
docker build -t gryag-bot .
docker run -d --name gryag-bot --env-file .env gryag-bot
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support or questions, please open an issue on GitHub.
