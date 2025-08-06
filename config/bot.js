require('dotenv').config();

if (!process.env.BOT_TOKEN) {
  console.warn('Missing BOT_TOKEN environment variable');
}

if (!process.env.BOT_USERNAME) {
  console.warn('Missing BOT_USERNAME environment variable');
}

module.exports = {
  token: process.env.BOT_TOKEN,
  username: process.env.BOT_USERNAME,
  name: process.env.BOT_NAME || 'Gryag Bot',
  adminIds:
    process.env.ADMIN_USER_IDS?.split(',')
      .map((id) => parseInt(id, 10))
      .filter(Number.isFinite) || [],
  polling: process.env.NODE_ENV === 'development',
  webhook: {
    url: process.env.WEBHOOK_URL,
    port: process.env.PORT || 3000
  }
};
