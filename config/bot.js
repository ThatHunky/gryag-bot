require('dotenv').config();

module.exports = {
  token: process.env.BOT_TOKEN,
  username: process.env.BOT_USERNAME,
  name: process.env.BOT_NAME || 'Gryag Bot',
  adminIds: process.env.ADMIN_USER_IDS?.split(',').map(id => parseInt(id)) || [],
  polling: process.env.NODE_ENV === 'development',
  webhook: {
    url: process.env.WEBHOOK_URL,
    port: process.env.PORT || 3000
  }
};
