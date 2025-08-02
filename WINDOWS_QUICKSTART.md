# 🚀 Швидкий старт Gryag Bot на Windows

## Передумови

1. **Docker Desktop** встановлений та запущений
2. **Git for Windows** встановлений
3. **PowerShell 5.1+** або **PowerShell Core 7+**

## Крок 1: Клонування репозиторію

```powershell
git clone https://github.com/yourusername/gryag-bot.git
cd gryag-bot
```

## Крок 2: Налаштування змінних середовища

```powershell
# Копіювання шаблону
Copy-Item .env.docker.example .env

# Редагування у Notepad++, VS Code або будь-якому текстовому редакторі
notepad .env
```

**Мінімальні налаштування:**
```env
BOT_TOKEN=1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
GEMINI_API_KEY=AIzaSyAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
ADMIN_USER_IDS=123456789
BOT_USERNAME=your_bot_username
GITHUB_REPO=https://github.com/yourusername/gryag-bot.git
```

## Крок 3: Запуск бота

### Варіант A: PowerShell скрипт (рекомендовано)

```powershell
# Надання дозволу на виконання скрипта (одноразово)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Запуск бота
.\deploy.ps1 start
```

### Варіант B: Docker Compose напряму

```powershell
docker-compose up -d
```

## Крок 4: Перевірка статусу

```powershell
# Статус бота
.\deploy.ps1 status

# Логи бота
.\deploy.ps1 logs

# Статус Docker контейнера
docker ps
```

## Корисні команди

```powershell
# Зупинка бота
.\deploy.ps1 stop

# Перезапуск бота
.\deploy.ps1 restart

# Оновлення з GitHub
.\deploy.ps1 update

# Створення резервної копії
.\deploy.ps1 backup

# Очищення старих даних
.\deploy.ps1 cleanup
```

## Розробка

Для розробки використовуйте development compose:

```powershell
# Запуск в режимі розробки
docker-compose -f docker-compose.dev.yml up -d

# Логи з hot reload
docker-compose -f docker-compose.dev.yml logs -f
```

## Усунення несправностей

### Docker Desktop не запускається

1. Перезапустіть Windows
2. Увімкніть Hyper-V у Windows Features
3. Перевірте віртуалізацію в BIOS

### PowerShell не виконує скрипти

```powershell
# Встановіть політику виконання
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Проблеми з правами доступу

```powershell
# Запустіть PowerShell як адміністратор
Start-Process powershell -Verb runAs
```

### Бот не відповідає

1. Перевірте .env файл
2. Перегляньте логи: `.\deploy.ps1 logs`
3. Перевірте health check: `docker inspect gryag-bot`

## Автооновлення

Автооновлення працює автоматично щодня о 3:00 ночі за українським часом. Логи автооновлення:

```powershell
# Перегляд логів автооновлення
docker exec gryag-bot cat /var/log/auto-update.log
```

## Моніторинг

### Windows Performance Toolkit

```powershell
# Використання ресурсів
docker stats gryag-bot

# Детальний статус
.\deploy.ps1 status
```

### Task Manager

Шукайте процеси:
- `Docker Desktop`
- `node.exe` (всередині контейнера)

## Резервне копіювання

```powershell
# Автоматичне резервне копіювання
.\deploy.ps1 backup

# Ручне копіювання бази даних
Copy-Item data\bot.db data\backups\manual_backup.db
```

## Видалення

```powershell
# Зупинка та видалення контейнера
.\deploy.ps1 stop
docker-compose down --volumes

# Видалення образу
docker rmi gryag-bot_gryag-bot

# Видалення даних (УВАГА: незворотно!)
Remove-Item data -Recurse -Force
```

---

**Довідка PowerShell скрипта:**

```powershell
.\deploy.ps1 -Action start     # Запуск
.\deploy.ps1 -Action stop      # Зупинка
.\deploy.ps1 -Action restart   # Перезапуск
.\deploy.ps1 -Action update    # Оновлення
.\deploy.ps1 -Action logs      # Логи
.\deploy.ps1 -Action status    # Статус
.\deploy.ps1 -Action backup    # Резервна копія
.\deploy.ps1 -Action cleanup   # Очищення
```
