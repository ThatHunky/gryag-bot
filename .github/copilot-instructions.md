# Gryag Bot - AI Coding Instructions

## Architecture Overview

This is a multilingual Telegram bot with Google Gemini AI integration, featuring admin controls and group chat intelligence. The bot is **disabled by default** and shows status messages in private#### Context-Aware Development Patterns

Remember these key architectural patterns when working with the bot:

- **Conversation Context**: All user messages are automatically stored in `geminiService.chatContexts` Map
- **Message Addition**: Use `geminiService.addToContext(chatId, message)` for both user and bot messages
- **Context Formatting**: Current message is highlighted as `>>> ПОТОЧНЕ ПОВІДОМЛЕННЯ` with reply information
- **Per-User Throttling**: Check with `throttleService.canProcessMessage()` - no global chat cooldowns
- **MIME Type Handling**: Telegram may send `application/octet-stream` for images - auto-fix to `image/jpeg`
- **Language Default**: Ukrainian (`uk`) is default language, auto-detection still works
- **Environment Variables**: Context size controlled by `MAX_CONTEXT_MESSAGES` and `CONTEXT_MESSAGES_FOR_AI`

#### Throttling System

- **Multi-layer protection**: User cooldowns and rate limiting (removed chat cooldowns)
- **Admin exemptions**: Admins have reduced throttling limits
- **Smart configuration**: Different limits for private vs group chats
- **Localized responses**: Throttle messages use `languageService` for user's language
- **Memory management**: Automatic cleanup prevents memory leaks

Throttling parameters:

- User cooldowns: 2s private, 5s groups, 1s admins
- Rate limits: 20 msg/min users, 60 msg/min admins
- No global chat cooldowns (removed for per-user throttling)d of AI responses.

### Core Components

- **Handler-Service Pattern**: Commands, callbacks, and messages are handled by separate classes that delegate to services
- **Multilingual by Design**: All user-facing text goes through `languageService.getText(userId, key)` with auto-detection
- **State-Aware Bot**: Uses `botStateService` to control when bot responds (admin toggle functionality)
- **Group Chat Smart**: Only responds to mentions (`@bot_username`) or replies to bot messages in groups
- **Anti-Spam Protection**: Multi-layer throttling system prevents abuse and API overuse

## Key Service Boundaries

```javascript
// Core services that other components depend on
botStateService      // Controls bot enable/disable state, admin checks
languageService      // Handles UK/EN text, auto-detection, system prompts
geminiService        // Google AI integration with context-aware responses
throttleService      // Manages message rate limiting and spam prevention
```

## Critical Behavioral Patterns

### 1. Message Routing Logic
```javascript
// messages.js - Private chats ONLY show status, never AI responses
if (msg.chat.type === 'private') {
  const statusMessage = botStateService.getStatusMessage(userId, languageService);
  return await bot.sendMessage(chatId, statusMessage, { parse_mode: 'HTML' });
}

// Groups check bot state before AI responses
// CRITICAL: When bot is disabled, silently ignore group messages (never spam)
if (!botStateService.shouldRespond(userId)) {
  return; // Silently ignore - do NOT send "bot disabled" messages in groups
}
```

### 2. Admin State Management
- Bot starts `isEnabled = false` by default
- Only users in `config.adminIds` can toggle bot state
- When disabled: admins get full access, others get "bot disabled" messages
- Admin panel only works in private chats (never groups)

### 3. Language Detection Flow
```javascript
// Auto-detect on first interaction, then remember
languageService.autoDetectAndSetLanguage(userId, msg.text);
const text = languageService.getText(userId, 'welcome', firstName, config.name);
```

## Essential File Patterns

### Handler Structure

All handlers follow this pattern:

```javascript
class CommandHandler {
  static async commandName(msg, bot) {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;

    // Always check language and bot state first
    const text = languageService.getText(userId, 'key');
    if (!botStateService.shouldRespond(userId)) return;

    // Check throttling for non-admin users
    if (!botStateService.isAdmin(userId)) {
      const throttleCheck = throttleService.canProcessMessage(userId, chatId, chatType);
      if (!throttleCheck.allowed) {
        await this.handleThrottleResponse(throttleCheck, userId, chatId, bot, msg.message_id);
        return;
      }
    }

    // Use inline keyboards for interactions
    const keyboard = { inline_keyboard: [[{...}]] };
    await bot.sendMessage(chatId, text, { reply_markup: keyboard });
  }
}
```

### Service Dependencies

```javascript
// Services are singletons, import at top
const botStateService = require('../services/botState');
const languageService = require('../services/language');
const geminiService = require('../services/gemini');
const throttleService = require('../services/throttle');
```

## Environment Configuration

Required `.env` variables:
```bash
BOT_TOKEN=                     # From @BotFather
GEMINI_API_KEY=                # Google AI Studio
ADMIN_USER_IDS=                # Comma-separated Telegram user IDs
BOT_USERNAME=                  # Without @ symbol
MAX_CONTEXT_MESSAGES=100       # Maximum messages to store per chat
CONTEXT_MESSAGES_FOR_AI=20     # Messages to include in AI context
```

## Development Workflow

### Start Development
```bash
npm run dev          # Uses polling, auto-restarts
```

### Testing Flow
1. Private chat: Should show bot status (enabled/disabled)
2. Groups: Mention bot `@username` to trigger AI responses
3. Admin commands: `/admin` only works in private chat
4. Language switch: Auto-detects Ukrainian vs English

### Key Integration Points

- **Gemini AI**: Contextual responses use `languageService.getSystemPrompt(userId)` for locale-specific behavior
- **Admin Panel**: Callback handlers in `callbacks.js` manage `admin_*` callback_data patterns
- **Group Intelligence**: `handleGroupMessage()` checks for mentions/replies before calling Gemini

## Project-Specific Conventions

### Error Patterns
Always provide localized fallbacks:
```javascript
const fallbackMessage = languageService.getText(userId, 'aiGenericError');
```

### State Checking Pattern
Check bot state early in message handlers:
```javascript
if (!botStateService.shouldRespond(userId)) {
  // Handle disabled bot state
  return;
}
```

### Callback Data Naming
Use prefixed patterns: `admin_toggle_bot`, `lang_uk`, `settings_notifications`

### Text Key Conventions
- `welcome`, `help`, `settings` - Core UI text
- `botDisabled`, `notAdmin` - State-specific messages
- `aiGenericError`, `testSuccess` - AI integration feedback

This architecture enables clean separation between Telegram mechanics, AI integration, and business logic while maintaining multilingual support, admin controls, and comprehensive anti-spam protection.

## Current Bot Features

### 🤖 Core Functionality

- **Multilingual Support**: Ukrainian and English with auto-detection (Ukrainian by default)
- **AI Integration**: Google Gemini for intelligent responses
- **Multimodal Support**: Photos, documents, stickers with vision AI
- **Smart Chat Behavior**: Different behavior for private vs group chats
- **Admin Controls**: Enable/disable bot, manage settings, view statistics

### 🛡️ Security & Anti-Spam

- **Per-User Throttling**: Individual cooldowns for each user (removed global chat cooldowns)
- **Admin Exemptions**: Reduced limits for administrators
- **Memory Management**: Automatic cleanup prevents memory leaks
- **Localized Responses**: Throttle messages in user's preferred language
- **MIME Type Validation**: Handles Telegram's inconsistent MIME types for media

### 👥 Chat Management

- **Private Chats**: Show bot status instead of AI responses
- **Group Intelligence**: Respond only to mentions or replies
- **State Control**: Bot disabled by default, admin can enable
- **Context Awareness**: Different prompts and behavior per language
- **Conversation Context**: Stores last 100 messages per chat with detailed user info
- **Smart Reply Detection**: Shows who user is replying to in context

### �️ Multimodal AI Capabilities

- **Vision Support**: Google Gemini Vision API processes photos, documents, and stickers
- **MIME Type Validation**: Automatic correction of Telegram's inconsistent MIME types (`application/octet-stream` → `image/jpeg`)
- **File Download**: Automatic file retrieval from Telegram servers with error handling
- **Context Integration**: Media descriptions included in conversation context for better AI understanding
- **Error Recovery**: Graceful fallbacks when media processing fails
- **Ukrainian Responses**: All media analysis responses in Ukrainian language

### �💬 Conversation Context System

- **Memory Storage**: Uses Map to store context per chatId with automatic cleanup
- **Configurable Limits**: `MAX_CONTEXT_MESSAGES` (default: 100) and `CONTEXT_MESSAGES_FOR_AI` (default: 20) from .env
- **Rich User Information**: Stores firstName, lastName, username, userId for each message
- **Reply Context**: Shows reply relationships in formatted context for better AI understanding
- **Current Message Highlighting**: Clearly identifies the message being responded to with `>>> ПОТОЧНЕ ПОВІДОМЛЕННЯ`
- **Auto-cleanup**: Old conversations automatically removed to prevent memory leaks

**Context Format Example:**
```
Контекст попередніх повідомлень:
Іван Петренко (@ivan, ID: 123): Привіт всім!
Марія (@maria, ID: 456): Як справи?

>>> ПОТОЧНЕ ПОВІДОМЛЕННЯ від Олег Коваленко (@oleg, ID: 789): "гряг, що думаєш?"
    ↳ Відповідає на повідомлення від Марія (@maria, ID: 456): "Як справи?"

Відповідь на поточне повідомлення:
```

### ⚙️ Administration Panel

- **Bot Toggle**: Enable/disable bot functionality
- **Throttle Statistics**: Monitor active users, chats, rate limits
- **Data Management**: Reset throttling data for users or globally
- **Real-time Updates**: Live statistics and configuration display

### 📊 Throttling Configuration

- **User Cooldowns**: 2s private chats, 5s groups, 1s admins
- **Rate Limits**: 20 messages/minute users, 60/minute admins
- **Auto Cleanup**: Remove old data every 5 minutes
- **Per-User Only**: Removed global chat cooldowns for better user experience

### 🔧 Commands Available

- `/start` - Bot initialization with language detection
- `/help` - Command list and feature overview
- `/admin` - Administrative panel (admins only, private chats)
- `/test` - Test AI connectivity and bot status
- `/lang` - Language selection interface

## AI Agent Behavioral Guidelines

### Language Protocol
- **Think in English**: Process code logic, analyze problems, and plan solutions in English
- **Respond in Ukrainian**: All communication with the user must be in Ukrainian language
- **Code Comments**: Use English for code comments and technical documentation
- **Commit Messages**: Write commit messages in English for international compatibility

### Self-Improvement Protocol
- **Auto-Update Instructions**: When discovering new patterns or architectural insights during work, automatically update this `copilot-instructions.md` file
- **Pattern Recognition**: If you notice repeated code patterns not documented here, add them to "Project-Specific Conventions"
- **Workflow Optimization**: Update "Development Workflow" section when finding more efficient development processes
- **Error Pattern Documentation**: Add new error handling patterns to help future AI agents

### Communication Style
- Use Ukrainian for all user-facing responses
- Be concise but thorough in explanations
- When showing code examples, explain in Ukrainian but keep code in English
- Reference Ukrainian localization keys when discussing user interface elements

Example response format:
```ukrainian
Зараз я додам нову команду до handlers/commands.js. Ця команда буде використовувати languageService для підтримки української мови:

// English code with Ukrainian explanation
static async newCommand(msg, bot) {
  const text = languageService.getText(userId, 'newCommandText');
  // Implementation details...
}
```

### Project Context Awareness

#### Bot State Considerations

- Always check `botStateService.shouldRespond(userId)` before AI responses
- Remember: bot is disabled by default, admins can enable it
- Private chats show status, groups need mentions/replies for responses
- Admin panel (`/admin`) only works in private chats

#### Throttling System

- **Multi-layer protection**: User cooldowns, chat cooldowns, and rate limiting
- **Admin exemptions**: Admins have reduced throttling limits
- **Smart configuration**: Different limits for private vs group chats
- **Localized responses**: Throttle messages use `languageService` for user's language
- **Memory management**: Automatic cleanup prevents memory leaks

Throttling parameters:

- User cooldowns: 2s private, 5s groups, 1s admins
- Rate limits: 20 msg/min users, 60 msg/min admins
- No global chat cooldowns (removed for per-user throttling)

#### Multilingual Implementation

- All user text must go through `languageService.getText(userId, key)`
- Auto-detect language on first interaction with `autoDetectAndSetLanguage()`
- System prompts are locale-specific: use `getSystemPrompt(userId)` for Gemini
- Text keys follow pattern: core UI (`welcome`, `help`) vs state messages (`botDisabled`, `notAdmin`)

#### Common Pitfalls to Avoid

- Don't hardcode text strings - always use language service
- Don't forget to check bot state before responding
- Don't respond to every group message - only mentions and replies
- Don't allow admin panel in groups - private chat only
- Don't skip throttle checks for non-admin users
- Don't forget to import `throttleService` in handlers
- **CRITICAL**: Never send "bot disabled" messages in groups - this causes spam and rate limiting

#### Anti-Spam Rule: Silent Group Behavior

When bot is disabled:
- **Private chats**: Show status message explaining bot is disabled
- **Group chats**: Silently ignore ALL messages (never notify about disabled state)
- **Reason**: Groups can have high message volume causing Telegram 429 rate limits

### Throttling Integration Patterns

#### Handler Throttle Check Template

```javascript
// Standard throttle check pattern for all handlers
if (!botStateService.isAdmin(userId)) {
  const throttleCheck = throttleService.canProcessMessage(userId, chatId, chatType);
  if (!throttleCheck.allowed) {
    await this.handleThrottleResponse(throttleCheck, userId, chatId, bot, msg.message_id);
    return;
  }
}
```

#### Throttle Response Handler

Every handler class should include this method:

```javascript
static async handleThrottleResponse(throttleResult, userId, chatId, bot, replyToMessageId) {
  let message;

  switch (throttleResult.reason) {
    case 'user_cooldown':
      const timeLeft = throttleService.formatTimeLeft(throttleResult.timeLeft);
      message = languageService.getText(userId, 'throttleUserCooldown', timeLeft);
      break;
    case 'chat_cooldown':
      const chatTimeLeft = throttleService.formatTimeLeft(throttleResult.timeLeft);
      message = languageService.getText(userId, 'throttleChatCooldown', chatTimeLeft);
      break;
    case 'rate_limit':
      const resetTime = throttleService.formatTimeLeft(throttleResult.resetTime - Date.now());
      message = languageService.getText(userId, 'throttleRateLimit', resetTime);
      break;
    default:
      message = languageService.getText(userId, 'errorProcessing');
  }

  try {
    await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_to_message_id: replyToMessageId
    });
  } catch (error) {
    console.error('Error sending throttle response:', error);
  }
}
```

#### Admin Panel Extensions

Admin panel now includes throttling management:

- **Statistics View**: Shows active users, chats, rate limits
- **Configuration Display**: Current cooldown and rate limit settings
- **Reset Functions**: Clear individual user or all throttling data
- **Real-time Monitoring**: Live stats updates via callback queries

Callback data patterns:
- `admin_throttle_stats` - Show throttling statistics
- `admin_throttle_reset` - Show reset options menu
- `admin_throttle_reset_user` - Reset specific user throttling
- `admin_throttle_reset_all` - Clear all throttling data

#### Required Text Keys

All throttle-related messages must be localized:

```javascript
// Ukrainian and English versions required
throttleUserCooldown: (timeLeft) => `⏰ <b>Зачекайте ${timeLeft}</b>\n\nВи надсилаєте повідомлення занадто швидко.`,
throttleChatCooldown: (timeLeft) => `⏱️ <b>Кулдаун чату: ${timeLeft}</b>\n\nЗанадто багато повідомлень у цьому чаті.`,
throttleRateLimit: (resetTime) => `🚫 <b>Перевищено ліміт швидкості</b>\n\nСпробуйте знову через ${resetTime}.`
```

### Service Testing Patterns

#### Throttle Service Testing

Use `throttle-test.js` for validation:

```javascript
// Test different scenarios
const result = throttleService.canProcessMessage(userId, chatId, chatType);
console.log('Throttle result:', result.allowed ? '✅ Allowed' : `❌ ${result.reason}`);
```

#### Memory Management Validation

Throttle service includes automatic cleanup:
- Runs every 5 minutes (`cleanupInterval: 300000`)
- Removes records older than 1 hour (`maxAge: 3600000`)
- Logs cleanup results for monitoring

### Architecture Decision Records

#### Why Custom Throttling Instead of Libraries

- **Full Control**: Exact requirements for multi-layer protection
- **Memory Efficiency**: Automatic cleanup prevents memory leaks
- **Localization**: Custom error messages in Ukrainian/English
- **Admin Features**: Built-in statistics and reset capabilities
- **Bot Integration**: Seamless integration with existing service pattern

### Development and Maintenance Patterns

#### Adding New Commands

1. **Create handler method** in `commands.js`
2. **Add throttle check** for non-admin users
3. **Include `handleThrottleResponse` method**
4. **Add localized text keys** in `language.js`
5. **Register command** in bot initialization

#### Adding New Callback Handlers

1. **Add case** in `callbacks.js` switch statement
2. **Implement callback method** with admin checks if needed
3. **Add Ukrainian/English text** for responses
4. **Test callback data patterns** follow `admin_*`, `lang_*` conventions

#### Adding New Text Keys

1. **Add to both languages** in `language.js`
2. **Use parametrized functions** for dynamic content
3. **Test with actual data** to ensure proper formatting
4. **Follow naming conventions**: `featureName` or `featureNameAction`

#### Testing Throttling Changes

1. **Use `throttle-test.js`** for basic functionality tests
2. **Test with real bot** for integration validation
3. **Check admin panel** statistics for monitoring
4. **Verify cleanup** runs properly in production

#### Performance Monitoring

- **Memory usage**: Check Map sizes in throttle service
- **Cleanup frequency**: Monitor log outputs for cleanup operations
- **Admin panel**: Use throttle statistics for performance insights
- **Bot responsiveness**: Watch for throttle-related delays

This comprehensive system ensures robust, scalable, and maintainable bot architecture with complete anti-spam protection.
