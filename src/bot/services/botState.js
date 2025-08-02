const config = require("../../../config/bot");

class BotStateService {
  constructor() {
    this.isEnabled = false; // За замовчуванням бот вимкнений
    this.disabledSince = new Date(); // Час початкового вимкнення
    this.disabledBy = "system"; // Вимкнений системою за замовчуванням
  }

  // Перевірка чи є користувач адміном
  isAdmin(userId) {
    return config.adminIds.includes(userId);
  }

  // Вимкнути бота
  disable(adminId) {
    if (!this.isAdmin(adminId)) {
      return false;
    }

    this.isEnabled = false;
    this.disabledSince = new Date();
    this.disabledBy = adminId;

    console.log(`🔴 Bot disabled by admin ${adminId} at ${this.disabledSince}`);
    return true;
  }

  // Увімкнути бота
  enable(adminId) {
    if (!this.isAdmin(adminId)) {
      return false;
    }

    this.isEnabled = true;
    this.disabledSince = null;
    this.disabledBy = null;

    console.log(`🟢 Bot enabled by admin ${adminId}`);
    return true;
  }

  // Перемкнути стан бота
  toggle(adminId) {
    if (!this.isAdmin(adminId)) {
      return { success: false, enabled: this.isEnabled };
    }

    if (this.isEnabled) {
      this.disable(adminId);
    } else {
      this.enable(adminId);
    }

    return { success: true, enabled: this.isEnabled };
  }

  // Отримати поточний стан
  getStatus() {
    return {
      enabled: this.isEnabled,
      disabledSince: this.disabledSince,
      disabledBy: this.disabledBy,
    };
  }

  // Перевірити чи бот має відповідати на повідомлення
  shouldRespond(userId = null) {
    // Якщо бот вимкнений, відповідає тільки адмінам
    if (!this.isEnabled) {
      return userId && this.isAdmin(userId);
    }

    return true;
  }

  // Отримати повідомлення про стан для адміна
  getStatusMessage(userId, languageService) {
    const userLang = languageService.getUserLanguage(userId);
    const isAdmin = this.isAdmin(userId);

    if (this.isEnabled) {
      if (isAdmin) {
        return userLang === "uk"
          ? "🟢 <b>Статус бота: Увімкнений</b>\n\nБот активний та відповідає на всі повідомлення.\n\n🔧 Використовуйте /admin для управління."
          : "🟢 <b>Bot Status: Enabled</b>\n\nBot is active and responding to all messages.\n\n🔧 Use /admin for management.";
      } else {
        return userLang === "uk"
          ? "🟢 <b>Бот активний</b>\n\nДля взаємодії використовуйте команди або згадайте мене в групі."
          : "🟢 <b>Bot is active</b>\n\nUse commands or mention me in groups to interact.";
      }
    } else {
      const disabledTime = this.disabledSince
        ? this.disabledSince.toLocaleString()
        : "Unknown";
      if (isAdmin) {
        return userLang === "uk"
          ? `🔴 <b>Статус бота: Вимкнений</b>\n\nБот вимкнений з: ${disabledTime}\nВимкнув: ${this.disabledBy === "system" ? "Система" : "Адмін " + this.disabledBy}\n\n⚠️ Бот відповідає тільки адмінам.\n🔧 Використовуйте /admin для управління.`
          : `🔴 <b>Bot Status: Disabled</b>\n\nBot disabled since: ${disabledTime}\nDisabled by: ${this.disabledBy === "system" ? "System" : "Admin " + this.disabledBy}\n\n⚠️ Bot only responds to admins.\n🔧 Use /admin for management.`;
      } else {
        return userLang === "uk"
          ? "🔴 <b>Бот наразі вимкнений</b>\n\nТільки адміністратори можуть взаємодіяти з ботом.\n\n💡 <i>Зверніться до адміністратора для увімкнення</i>"
          : "🔴 <b>Bot is currently disabled</b>\n\nOnly administrators can interact with the bot.\n\n💡 <i>Contact an administrator to enable the bot</i>";
      }
    }
  }

  // Отримати клавіатуру управління для адміна
  getAdminKeyboard(userId, languageService) {
    const userLang = languageService.getUserLanguage(userId);

    const toggleText = this.isEnabled
      ? userLang === "uk"
        ? "🔴 Вимкнути бота"
        : "🔴 Disable Bot"
      : userLang === "uk"
        ? "🟢 Увімкнути бота"
        : "🟢 Enable Bot";

    const refreshText =
      userLang === "uk" ? "🔄 Оновити статус" : "🔄 Refresh Status";
    const throttleText = userLang === "uk" ? "⏱️ Троттлінг" : "⏱️ Throttling";
    const backText = userLang === "uk" ? "🔙 Назад" : "🔙 Back";

    return {
      inline_keyboard: [
        [{ text: toggleText, callback_data: "admin_toggle_bot" }],
        [{ text: refreshText, callback_data: "admin_status" }],
        [{ text: throttleText, callback_data: "admin_throttle_stats" }],
        [{ text: backText, callback_data: "main_menu" }],
      ],
    };
  }
}

module.exports = new BotStateService();
