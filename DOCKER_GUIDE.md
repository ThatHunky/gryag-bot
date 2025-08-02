# Gryag Bot - Docker Deployment Guide

## 🐳 Докеризація та автооновлення

Цей гід описує як запустити Gryag Bot у Docker контейнері з можливістю автоматичного оновлення кожного дня вночі з GitHub.

## 📋 Передумови

- Docker та Docker Compose встановлені на сервері
- Git встановлений для клонування репозиторію
- Доступ до GitHub репозиторію бота

## 🚀 Швидкий старт

### 1. Клонування репозиторію

```bash
git clone https://github.com/yourusername/gryag-bot.git
cd gryag-bot
```

### 2. Налаштування змінних середовища

```bash
# Копіювання шаблону конфігурації
cp .env.docker.example .env

# Редагування конфігурації
nano .env
```

**Обов'язкові налаштування:**
```env
BOT_TOKEN=your_bot_token_here
GEMINI_API_KEY=your_gemini_api_key_here
ADMIN_USER_IDS=123456789,987654321
BOT_USERNAME=your_bot_username
GITHUB_REPO=https://github.com/yourusername/gryag-bot.git
```

### 3. Запуск бота

```bash
# Надання прав на виконання
chmod +x deploy.sh

# Запуск бота
./deploy.sh start
```

## 📁 Структура Docker проекту

```
gryag-bot/
├── Dockerfile                 # Конфігурація Docker образу
├── docker-compose.yml         # Оркестрація контейнерів
├── deploy.sh                  # Скрипт управління
├── .env.docker.example        # Шаблон змінних середовища
├── scripts/
│   ├── auto-update.sh         # Скрипт автооновлення
│   └── healthcheck.js         # Health check для Docker
├── data/                      # Постійні дані
│   ├── bot.db                 # База даних
│   └── backups/               # Резервні копії
└── logs/                      # Логи автооновлення
```

## 🔧 Команди управління

Скрипт `deploy.sh` надає зручні команди для управління ботом:

```bash
# Запуск бота
./deploy.sh start

# Зупинка бота
./deploy.sh stop

# Перезапуск бота
./deploy.sh restart

# Оновлення та перезапуск
./deploy.sh update

# Перегляд логів
./deploy.sh logs

# Статус бота
./deploy.sh status

# Очищення старих даних
./deploy.sh cleanup

# Створення резервної копії
./deploy.sh backup
```

## 🔄 Система автооновлення

### Як працює автооновлення

1. **Щодня о 3:00 ночі** (за українським часом) запускається cron job
2. **Перевірка оновлень** на GitHub у вказаній гілці
3. **Створення резервної копії** бази даних
4. **Завантаження нового коду** з GitHub
5. **Оновлення залежностей** (якщо змінився package.json)
6. **Graceful перезапуск** бота
7. **Відправка повідомлення** про успішне оновлення (опціонально)

### Конфігурація автооновлення

```env
# Увімкнути/вимкнути автооновлення
AUTO_UPDATE_ENABLED=true

# Репозиторій для оновлення
GITHUB_REPO=https://github.com/yourusername/gryag-bot.git

# Гілка для оновлення
GIT_BRANCH=main

# Час оновлення (HH:MM)
UPDATE_TIME=03:00

# Повідомлення про оновлення (опціонально)
UPDATE_NOTIFICATION_CHAT_ID=your_chat_id
```

### Логи автооновлення

Логи автооновлення зберігаються у `/var/log/auto-update.log`:

```bash
# Перегляд логів автооновлення
docker exec gryag-bot tail -f /var/log/auto-update.log

# Або через volume
tail -f logs/auto-update.log
```

## 🏥 Моніторинг та здоров'я

### Health Check

Docker контейнер включає автоматичну перевірку здоров'я:

- **Інтервал:** Кожні 30 секунд
- **Тайм-аут:** 10 секунд
- **Ретрай:** 3 спроби
- **Перевірки:** Процес бота, доступність бази даних, критичні помилки

```bash
# Перевірка статусу здоров'я
docker inspect --format='{{.State.Health.Status}}' gryag-bot
```

### Моніторинг ресурсів

```bash
# Статистика використання ресурсів
docker stats gryag-bot

# Детальна інформація
./deploy.sh status
```

## 💾 Резервне копіювання

### Автоматичне резервне копіювання

- **Щоденне резервне копіювання** бази даних перед оновленням
- **Зберігання 7 останніх копій** (старіші автоматично видаляються)
- **Ручне резервне копіювання** через `./deploy.sh backup`

### Відновлення з резервної копії

```bash
# Зупинка бота
./deploy.sh stop

# Відновлення бази даних
cp data/backups/bot_backup_YYYYMMDD_HHMMSS.db data/bot.db

# Запуск бота
./deploy.sh start
```

## 🔐 Безпека

### Користувач контейнера

Бот працює під непривілейованим користувачем `botuser` (UID: 1001).

### Мережева ізоляція

```yaml
# Docker Compose створює ізольовану мережу
networks:
  default:
    name: gryag-bot-network
```

### Обмеження ресурсів

```yaml
deploy:
  resources:
    limits:
      memory: 512M      # Максимум пам'яті
      cpus: '0.5'       # Максимум CPU
    reservations:
      memory: 256M      # Гарантована пам'ять
      cpus: '0.25'      # Гарантований CPU
```

## 🔧 Налаштування для production

### 1. Налаштування SSL (опціонально)

Якщо потрібен webhook режим:

```yaml
# Додати до docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
```

### 2. Зовнішня база даних (опціонально)

Для high-availability:

```yaml
services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: gryag_bot
      POSTGRES_USER: bot_user
      POSTGRES_PASSWORD: secure_password
```

### 3. Логування

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"     # Максимальний розмір файлу логу
    max-file: "3"       # Кількість файлів логів
```

## 🚨 Усунення несправностей

### Перевірка статусу

```bash
# Статус контейнера
./deploy.sh status

# Логи бота
./deploy.sh logs

# Логи автооновлення
docker exec gryag-bot cat /var/log/auto-update.log
```

### Поширені проблеми

1. **Бот не запускається**
   ```bash
   # Перевірка конфігурації
   docker-compose config

   # Перевірка логів
   docker-compose logs gryag-bot
   ```

2. **Автооновлення не працює**
   ```bash
   # Перевірка cron
   docker exec gryag-bot crontab -l

   # Ручний запуск оновлення
   docker exec gryag-bot /app/scripts/auto-update.sh
   ```

3. **Проблеми з пам'яттю**
   ```bash
   # Збільшення ліміту пам'яті у .env
   MEMORY_LIMIT=1024

   # Перезапуск
   ./deploy.sh restart
   ```

## 📊 Метрики та аналітика

### Основні метрики

- Час роботи контейнера
- Використання CPU та пам'яті
- Кількість повідомлень у базі даних
- Статус автооновлень

### Моніторинг через команди

```bash
# Статистика бази даних (у боті)
/stats

# Статус системи
./deploy.sh status

# Використання диска
du -sh data/ logs/
```

## 🔄 Оновлення системи

### Оновлення Docker образу

```bash
# Оновлення коду та перезбірка
./deploy.sh update

# Або вручну
git pull origin main
docker-compose build --no-cache
./deploy.sh restart
```

### Оновлення залежностей

Автооновлення автоматично перевіряє зміни в `package.json` та оновлює залежності при необхідності.

---

## 📝 Конфігурація cron для автооновлення

Автооновлення налаштовується автоматично через Docker, але для ручного налаштування:

```bash
# Редагування crontab
0 3 * * * /app/scripts/auto-update.sh >> /var/log/auto-update.log 2>&1
```

**Пояснення часу:**
- `0 3 * * *` = щодня о 3:00 ранку
- Можна змінити час у змінній `UPDATE_TIME` в `.env` файлі

Ця система забезпечує надійну та автоматичну роботу Gryag Bot з мінімальними втручаннями адміністратора!
