# Gryag Bot

A smart Telegram group chat bot with Google Gemini AI integration. Responds to mentions and replies with intelligent, contextual responses.

## Features

- 🤖 **AI-Powered Responses** - Uses Google Gemini for intelligent text generation
- 💬 **Group Chat Smart** - Only responds when mentioned or replied to
- 🎯 **Context Aware** - Understands conversation context and replies
- ⚡ **Fast & Efficient** - Built with Node.js for optimal performance
- 🔧 **Easy Setup** - Simple configuration and deployment
- 🌍 **Multilingual** - Supports Ukrainian and English with auto-detection
- 🛡️ **Admin Controls** - Disable/enable bot with admin panel
- 🔒 **Private Chat Status** - Shows bot status in private messages

## Quick Start

### 1. Get Your API Keys

1. **Bot Token**: Message [@BotFather](https://t.me/BotFather) on Telegram
   - Create a new bot with `/newbot`
   - Copy your bot token

2. **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with Google account
   - Create a new API key
   - Copy the key

### 2. Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your tokens
BOT_TOKEN=your_bot_token_here
GEMINI_API_KEY=your_gemini_api_key_here
BOT_USERNAME=your_bot_username
```

### 3. Run

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
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
NODE_ENV=development
PORT=3000
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

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
