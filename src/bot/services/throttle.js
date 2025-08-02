const config = require("../../../config/bot");

/**
 * Service for managing message throttling and rate limiting
 * Prevents spam and controls API usage frequency
 */
class ThrottleService {
  constructor() {
    // User-specific cooldowns: userId -> { lastMessage: timestamp, messageCount: number, resetTime: timestamp }
    this.userCooldowns = new Map();

    // Chat-specific cooldowns: chatId -> lastMessage timestamp
    this.chatCooldowns = new Map();

    // Rate limiting: userId -> { count: number, resetTime: timestamp }
    this.rateLimits = new Map();

    // Configuration
    this.config = {
      // User cooldowns (milliseconds)
      userCooldown: {
        private: 2000, // 2 seconds for private chats
        group: 5000, // 5 seconds for group chats
        admin: 1000, // 1 second for admins
      },

      // Chat cooldowns (milliseconds)
      chatCooldown: {
        group: 1500, // 1.5 seconds between any messages in group
        private: 0, // No chat cooldown for private chats
      },

      // Rate limiting (messages per minute)
      rateLimit: {
        user: 20, // 20 messages per minute per user
        admin: 60, // 60 messages per minute for admins
        windowMs: 60000, // 1 minute window
      },

      // Cleanup intervals
      cleanupInterval: 300000, // 5 minutes
      maxAge: 3600000, // 1 hour
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Check if user can send a message based on cooldown
   * @param {number} userId - Telegram user ID
   * @param {string} chatType - 'private' or 'group' or 'supergroup'
   * @returns {Object} { allowed: boolean, timeLeft?: number, reason?: string }
   */
  canUserSendMessage(userId, chatType = "group") {
    const now = Date.now();
    const isAdmin = this.isAdmin(userId);

    // Determine cooldown based on chat type and admin status
    let cooldownMs;
    if (isAdmin) {
      cooldownMs = this.config.userCooldown.admin;
    } else if (chatType === "private") {
      cooldownMs = this.config.userCooldown.private;
    } else {
      cooldownMs = this.config.userCooldown.group;
    }

    const userRecord = this.userCooldowns.get(userId);

    if (userRecord) {
      const timeSinceLastMessage = now - userRecord.lastMessage;

      if (timeSinceLastMessage < cooldownMs) {
        return {
          allowed: false,
          timeLeft: cooldownMs - timeSinceLastMessage,
          reason: "user_cooldown",
        };
      }
    }

    // Update user record
    this.userCooldowns.set(userId, {
      lastMessage: now,
      messageCount: (userRecord?.messageCount || 0) + 1,
      resetTime: userRecord?.resetTime || now,
    });

    return { allowed: true };
  }

  /**
   * Check if chat can receive a message based on global chat cooldown
   * @param {number} chatId - Telegram chat ID
   * @param {string} chatType - 'private' or 'group' or 'supergroup'
   * @returns {Object} { allowed: boolean, timeLeft?: number, reason?: string }
   */
  canChatReceiveMessage(chatId, chatType = "group") {
    const now = Date.now();

    // No chat cooldown for private chats
    if (chatType === "private") {
      return { allowed: true };
    }

    const cooldownMs = this.config.chatCooldown.group;
    const lastMessage = this.chatCooldowns.get(chatId) || 0;
    const timeSinceLastMessage = now - lastMessage;

    if (timeSinceLastMessage < cooldownMs) {
      return {
        allowed: false,
        timeLeft: cooldownMs - timeSinceLastMessage,
        reason: "chat_cooldown",
      };
    }

    this.chatCooldowns.set(chatId, now);
    return { allowed: true };
  }

  /**
   * Check rate limiting for user (messages per minute)
   * @param {number} userId - Telegram user ID
   * @returns {Object} { allowed: boolean, resetTime?: number, reason?: string }
   */
  checkRateLimit(userId) {
    const now = Date.now();
    const isAdmin = this.isAdmin(userId);
    const maxMessages = isAdmin
      ? this.config.rateLimit.admin
      : this.config.rateLimit.user;
    const windowMs = this.config.rateLimit.windowMs;

    const rateRecord = this.rateLimits.get(userId);

    if (!rateRecord || now - rateRecord.resetTime >= windowMs) {
      // First message or window expired - reset counter
      this.rateLimits.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { allowed: true };
    }

    if (rateRecord.count >= maxMessages) {
      return {
        allowed: false,
        resetTime: rateRecord.resetTime,
        reason: "rate_limit",
      };
    }

    // Increment counter
    rateRecord.count++;
    return { allowed: true };
  }

  /**
   * Comprehensive check - combines user throttling mechanisms (removed chat cooldown)
   * @param {number} userId - Telegram user ID
   * @param {number} chatId - Telegram chat ID
   * @param {string} chatType - 'private' or 'group' or 'supergroup'
   * @returns {Object} { allowed: boolean, reason?: string, timeLeft?: number, resetTime?: number }
   */
  canProcessMessage(userId, chatId, chatType = "group") {
    // Check rate limiting first
    const rateCheck = this.checkRateLimit(userId);
    if (!rateCheck.allowed) {
      return rateCheck;
    }

    // Check user cooldown only (removed chat cooldown for per-user throttling)
    const userCheck = this.canUserSendMessage(userId, chatType);
    if (!userCheck.allowed) {
      return userCheck;
    }

    return { allowed: true };
  }

  /**
   * Get formatted time string for cooldown messages
   * @param {number} milliseconds - Time in milliseconds
   * @returns {string} Formatted time string
   */
  formatTimeLeft(milliseconds) {
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}с`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}хв ${remainingSeconds}с`
      : `${minutes}хв`;
  }

  /**
   * Get user statistics
   * @param {number} userId - Telegram user ID
   * @returns {Object} User throttling statistics
   */
  getUserStats(userId) {
    const userRecord = this.userCooldowns.get(userId);
    const rateRecord = this.rateLimits.get(userId);

    return {
      messageCount: userRecord?.messageCount || 0,
      lastMessage: userRecord?.lastMessage || null,
      rateLimit: {
        count: rateRecord?.count || 0,
        resetTime: rateRecord?.resetTime || null,
        remaining: Math.max(
          0,
          (this.isAdmin(userId)
            ? this.config.rateLimit.admin
            : this.config.rateLimit.user) - (rateRecord?.count || 0)
        ),
      },
    };
  }

  /**
   * Check if user is admin
   * @param {number} userId - Telegram user ID
   * @returns {boolean} True if user is admin
   */
  isAdmin(userId) {
    return config.adminIds.includes(userId);
  }

  /**
   * Reset user throttling data (admin function)
   * @param {number} userId - Telegram user ID
   */
  resetUser(userId) {
    this.userCooldowns.delete(userId);
    this.rateLimits.delete(userId);
  }

  /**
   * Reset chat throttling data (admin function)
   * @param {number} chatId - Telegram chat ID
   */
  resetChat(chatId) {
    this.chatCooldowns.delete(chatId);
  }

  /**
   * Start automatic cleanup timer
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up old records to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    const maxAge = this.config.maxAge;

    // Clean user cooldowns
    for (const [userId, record] of this.userCooldowns.entries()) {
      if (now - record.lastMessage > maxAge) {
        this.userCooldowns.delete(userId);
      }
    }

    // Clean chat cooldowns
    for (const [chatId, timestamp] of this.chatCooldowns.entries()) {
      if (now - timestamp > maxAge) {
        this.chatCooldowns.delete(chatId);
      }
    }

    // Clean rate limits that have expired
    for (const [userId, record] of this.rateLimits.entries()) {
      if (now > record.resetTime) {
        this.rateLimits.delete(userId);
      }
    }

    console.log(
      `🧹 Throttle cleanup completed. Active records: Users=${this.userCooldowns.size}, Chats=${this.chatCooldowns.size}, Rates=${this.rateLimits.size}`
    );
  }

  /**
   * Get service statistics
   * @returns {Object} Service statistics
   */
  getStats() {
    return {
      activeUsers: this.userCooldowns.size,
      activeChats: this.chatCooldowns.size,
      activeRateLimits: this.rateLimits.size,
      config: this.config,
    };
  }
}

module.exports = new ThrottleService();
