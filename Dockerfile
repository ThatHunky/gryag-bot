# Multi-stage Dockerfile для Gryag Bot з підтримкою автооновлення

# === DEVELOPMENT STAGE ===
FROM node:18-alpine AS development

# Встановлення необхідних пакетів для розробки
RUN apk add --no-cache git dcron sqlite

WORKDIR /app

# Копіювання package files
COPY package*.json ./

# Встановлення всіх залежностей (включно з dev)
RUN npm ci

# Копіювання коду
COPY . .

# Створення користувача
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botuser -u 1001

# Надання прав
RUN chown -R botuser:nodejs /app

USER botuser

EXPOSE 3000 9229

CMD ["npm", "run", "dev"]

# === PRODUCTION STAGE ===
FROM node:18-alpine AS production

# Встановлення необхідних пакетів для роботи з git та cron
RUN apk add --no-cache git dcron sqlite

# Створення робочої директорії
WORKDIR /app

# Копіювання package.json та package-lock.json
COPY package*.json ./

# Встановлення тільки production залежностей
RUN npm ci --only=production && npm cache clean --force

# Створення директорії для даних
RUN mkdir -p /app/data

# Копіювання коду програми
COPY . .

# Створення користувача для безпеки
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botuser -u 1001

# Створення скрипта автооновлення
COPY scripts/auto-update.sh /app/scripts/auto-update.sh
RUN chmod +x /app/scripts/auto-update.sh

# Налаштування cron для автооновлення (щодня о 3:00 ночі)
RUN echo "0 3 * * * /app/scripts/auto-update.sh >> /var/log/auto-update.log 2>&1" | crontab -

# Надання прав користувачу на робочу директорію
RUN chown -R botuser:nodejs /app && \
    chown -R botuser:nodejs /var/log

# Перехід на користувача botuser
USER botuser

# Експонування порту (для health check)
EXPOSE 3000

# Створення health check скрипта
COPY scripts/healthcheck.js /app/scripts/healthcheck.js

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node /app/scripts/healthcheck.js

# Запуск cron та бота
CMD ["sh", "-c", "crond && npm start"]
