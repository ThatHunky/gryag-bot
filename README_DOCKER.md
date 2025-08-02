# 🐳 Gryag Bot - Docker Edition

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com/)
[![Auto-Update](https://img.shields.io/badge/Auto--Update-Enabled-green)](https://github.com/features/actions)
[![Ukrainian](https://img.shields.io/badge/Lang-Ukrainian-yellow)](README_UK.md)

Потужний Telegram бот з AI інтеграцією, семантичним пошуком та автоматичним оновленням у Docker контейнері.

## ✨ Основні переваги Docker версії

- 🔄 **Автооновлення кожної ночі** з GitHub
- 🛡️ **Ізольоване середовище** та безпека
- 📊 **Health check** та моніторинг
- 💾 **Автоматичні резервні копії** бази даних
- 🚀 **Простий deployment** одною командою
- 🔧 **Cross-platform**: Linux, Windows, macOS

## 🚀 Швидкий старт

### Linux/macOS

```bash
git clone https://github.com/yourusername/gryag-bot.git
cd gryag-bot
cp .env.docker.example .env
# Відредагуйте .env файл
chmod +x deploy.sh
./deploy.sh start
```

### Windows

```powershell
git clone https://github.com/yourusername/gryag-bot.git
cd gryag-bot
Copy-Item .env.docker.example .env
# Відредагуйте .env файл
.\deploy.ps1 start
```

## 📋 Вимоги

- Docker 20.10+ та Docker Compose 2.0+
- Git для клонування репозиторію
- 512MB RAM мінімум (рекомендовано 1GB)
- 2GB вільного місця на диску

## ⚙️ Конфігурація

### Обов'язкові змінні (.env файл)

```env
# Telegram
BOT_TOKEN=1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
BOT_USERNAME=your_bot_username
ADMIN_USER_IDS=123456789,987654321

# Google AI
GEMINI_API_KEY=AIzaSyAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

# Автооновлення
GITHUB_REPO=https://github.com/yourusername/gryag-bot.git
AUTO_UPDATE_ENABLED=true
```

### Опціональні налаштування

```env
# Google Search
GOOGLE_SEARCH_API_KEY=your_api_key
GOOGLE_SEARCH_ENGINE_ID=your_engine_id

# Контекст
MAX_CONTEXT_MESSAGES=100
CONTEXT_MESSAGES_FOR_AI=20

# Система
TZ=Europe/Kiev
UPDATE_TIME=03:00
```

## 🔄 Система автооновлення

### Як працює

1. **Щодня о 3:00** перевіряє оновлення на GitHub
2. **Створює резервну копію** бази даних автоматично
3. **Завантажує новий код** та оновлює залежності
4. **Graceful restart** без втрати даних
5. **Логує весь процес** для моніторингу

### Конфігурація

```env
AUTO_UPDATE_ENABLED=true          # Увімкнути автооновлення
UPDATE_TIME=03:00                 # Час оновлення (HH:MM)
GIT_BRANCH=main                   # Гілка для оновлення
UPDATE_NOTIFICATION_CHAT_ID=123   # Повідомлення про оновлення
```

### Ручне оновлення

```bash
# Linux/macOS
./deploy.sh update

# Windows
.\deploy.ps1 update
```

## 📊 Моніторинг та логування

### Команди статусу

```bash
# Статус контейнера та ресурсів
./deploy.sh status

# Живі логи бота
./deploy.sh logs

# Логи автооновлення
docker exec gryag-bot cat /var/log/auto-update.log
```

### Health Check

Docker автоматично перевіряє здоров'я бота:

```bash
# Перевірка статусу здоров'я
docker inspect --format='{{.State.Health.Status}}' gryag-bot

# Можливі статуси: healthy, unhealthy, starting
```

### Метрики

```bash
# Використання ресурсів
docker stats gryag-bot

# Розмір бази даних
du -sh data/bot.db

# Кількість повідомлень (у боті)
/stats
```

## 💾 Резервне копіювання

### Автоматичне

- **Щоденне** резервне копіювання перед оновленням
- **7 останніх копій** зберігаються автоматично
- **Автоматичне очищення** старих копій

### Ручне

```bash
# Створення повної резервної копії
./deploy.sh backup

# Ручне копіювання тільки бази даних
cp data/bot.db data/backups/manual_$(date +%Y%m%d).db
```

### Відновлення

```bash
# Зупинка бота
./deploy.sh stop

# Відновлення з резервної копії
cp data/backups/bot_backup_20250803_030000.db data/bot.db

# Запуск бота
./deploy.sh start
```

## 🛠️ Команди управління

### deploy.sh (Linux/macOS)

```bash
./deploy.sh start      # Запуск бота
./deploy.sh stop       # Зупинка бота
./deploy.sh restart    # Перезапуск бота
./deploy.sh update     # Оновлення з GitHub
./deploy.sh build      # Перезбірка образу
./deploy.sh logs       # Перегляд логів
./deploy.sh status     # Статус та метрики
./deploy.sh cleanup    # Очищення старих даних
./deploy.sh backup     # Резервна копія
```

### deploy.ps1 (Windows)

```powershell
.\deploy.ps1 start     # Запуск бота
.\deploy.ps1 stop      # Зупинка бота
.\deploy.ps1 restart   # Перезапуск бота
.\deploy.ps1 update    # Оновлення з GitHub
.\deploy.ps1 build     # Перезбірка образу
.\deploy.ps1 logs      # Перегляд логів
.\deploy.ps1 status    # Статус та метрики
.\deploy.ps1 cleanup   # Очищення старих даних
.\deploy.ps1 backup    # Резервна копія
```

## 🔧 Розробка

### Development режим

```bash
# Запуск з hot reload
docker-compose -f docker-compose.dev.yml up -d

# Логи розробки
docker-compose -f docker-compose.dev.yml logs -f

# Debug порт доступний на localhost:9229
```

### Тестування

```bash
# Тестування семантичного пошуку
docker exec gryag-bot node test-semantic-search.js

# Тестування Google пошуку
docker exec gryag-bot node test-google-search.js

# Запуск всіх тестів
npm test
```

## 🚨 Усунення несправностей

### Часті проблеми

**Бот не запускається:**
```bash
# Перевірка конфігурації
docker-compose config

# Перевірка логів
./deploy.sh logs

# Перевірка .env файлу
cat .env
```

**Автооновлення не працює:**
```bash
# Перевірка cron всередині контейнера
docker exec gryag-bot crontab -l

# Ручний запуск автооновлення
docker exec gryag-bot /app/scripts/auto-update.sh

# Перевірка Git доступу
docker exec gryag-bot git fetch origin main
```

**Проблеми з пам'яттю:**
```bash
# Збільшення ліміту в docker-compose.yml
memory: 1024M

# Перезапуск з новими лімітами
./deploy.sh restart
```

**База даних пошкоджена:**
```bash
# Відновлення з резервної копії
./deploy.sh stop
cp data/backups/bot_backup_*.db data/bot.db
./deploy.sh start
```

### Логи

```bash
# Логи бота
./deploy.sh logs

# Логи автооновлення
docker exec gryag-bot tail -f /var/log/auto-update.log

# Системні логи Docker
docker logs gryag-bot

# Health check логи
docker inspect gryag-bot | grep -A 10 "Health"
```

## 🔐 Безпека

### Рекомендації

- Використовуйте сильні API ключі
- Регулярно оновлюйте базовий образ
- Моніторьте логи на підозрілу активність
- Не зберігайте секрети у Git репозиторії

### Мережева безпека

```yaml
# Ізольована мережа Docker
networks:
  default:
    name: gryag-bot-network
```

### Файлова система

- Бот працює під непривілейованим користувачем
- Обмежений доступ до файлової системи
- Автоматичне очищення тимчасових файлів

## 📈 Продуктивність

### Оптимізація ресурсів

```yaml
# Рекомендовані ліміти
deploy:
  resources:
    limits:
      memory: 512M      # Збільшіть при потребі
      cpus: '0.5'       # 50% одного ядра
    reservations:
      memory: 256M      # Гарантована пам'ять
      cpus: '0.25'      # Мінімальний CPU
```

### Моніторинг продуктивності

```bash
# Використання ресурсів в реальному часі
docker stats gryag-bot

# Аналіз використання диска
du -sh data/ logs/

# Статистика бази даних
sqlite3 data/bot.db "SELECT COUNT(*) FROM chat_messages;"
```

## 🆙 Оновлення системи

### Оновлення Docker образу

```bash
# Автоматичне оновлення (рекомендовано)
./deploy.sh update

# Ручне оновлення
git pull origin main
docker-compose build --no-cache
./deploy.sh restart
```

### Міграція версій

При оновленні між основними версіями:

1. Створіть повну резервну копію
2. Прочитайте CHANGELOG
3. Оновіть .env файл згідно з новими параметрами
4. Запустіть оновлення

## 📚 Додаткова документація

- [Детальний Docker гід](DOCKER_GUIDE.md)
- [Швидкий старт для Windows](WINDOWS_QUICKSTART.md)
- [Семантичний пошук](SEMANTIC_SEARCH_GUIDE.md)
- [Google Search інтеграція](GOOGLE_SEARCH_SETUP.md)
- [Адміністрування](ADMIN_GUIDE.md)

## 🤝 Підтримка

Якщо у вас виникли проблеми:

1. Перевірте [Issues](https://github.com/yourusername/gryag-bot/issues)
2. Створіть новий Issue з логами
3. Приєднайтесь до [Telegram чату](https://t.me/gryag_bot_support)

---

**Зроблено з ❤️ для української спільноти**
