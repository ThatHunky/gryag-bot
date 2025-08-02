#!/bin/sh

# Скрипт автооновлення Gryag Bot з GitHub
# Запускається щодня вночі через cron

LOG_FILE="/var/log/auto-update.log"
BACKUP_DIR="/app/data/backups"
APP_DIR="/app"

echo "$(date): Початок процесу автооновлення..." >> $LOG_FILE

# Перевірка чи увімкнено автооновлення
if [ "$AUTO_UPDATE_ENABLED" != "true" ]; then
    echo "$(date): Автооновлення вимкнено через змінну AUTO_UPDATE_ENABLED" >> $LOG_FILE
    exit 0
fi

# Функція для створення резервної копії бази даних
backup_database() {
    if [ -f "/app/data/bot.db" ]; then
        mkdir -p $BACKUP_DIR
        cp /app/data/bot.db $BACKUP_DIR/bot_backup_$(date +%Y%m%d_%H%M%S).db
        echo "$(date): Створено резервну копію бази даних" >> $LOG_FILE

        # Видалення старих резервних копій (залишаємо тільки останні 7)
        find $BACKUP_DIR -name "bot_backup_*.db" -type f -mtime +7 -delete
    fi
}

# Функція для отримання поточної версії (git hash)
get_current_version() {
    cd $APP_DIR
    git rev-parse HEAD 2>/dev/null || echo "unknown"
}

# Функція для перевірки оновлень на GitHub
check_for_updates() {
    cd $APP_DIR

    # Отримання останніх змін з віддаленого репозиторію
    git fetch origin $GIT_BRANCH 2>>$LOG_FILE

    # Порівняння поточної версії з віддаленою
    LOCAL_HASH=$(git rev-parse HEAD)
    REMOTE_HASH=$(git rev-parse origin/$GIT_BRANCH)

    if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
        echo "true"
    else
        echo "false"
    fi
}

# Функція для оновлення коду
update_code() {
    cd $APP_DIR

    echo "$(date): Початок оновлення коду..." >> $LOG_FILE

    # Збереження локальних змін (якщо є)
    git stash 2>>$LOG_FILE

    # Оновлення коду
    git pull origin $GIT_BRANCH 2>>$LOG_FILE

    if [ $? -eq 0 ]; then
        echo "$(date): Код успішно оновлено" >> $LOG_FILE
        return 0
    else
        echo "$(date): ПОМИЛКА: Не вдалося оновити код" >> $LOG_FILE
        return 1
    fi
}

# Функція для оновлення залежностей
update_dependencies() {
    cd $APP_DIR

    echo "$(date): Перевірка оновлень залежностей..." >> $LOG_FILE

    # Перевірка чи змінився package.json
    if git diff --name-only HEAD~1 HEAD | grep -q "package.json"; then
        echo "$(date): Виявлено зміни в package.json, оновлення залежностей..." >> $LOG_FILE
        npm ci --only=production 2>>$LOG_FILE

        if [ $? -eq 0 ]; then
            echo "$(date): Залежності успішно оновлено" >> $LOG_FILE
        else
            echo "$(date): ПОМИЛКА: Не вдалося оновити залежності" >> $LOG_FILE
            return 1
        fi
    else
        echo "$(date): Зміни в залежностях не виявлено" >> $LOG_FILE
    fi

    return 0
}

# Функція для перезапуску бота
restart_bot() {
    echo "$(date): Перезапуск бота..." >> $LOG_FILE

    # Знаходимо PID основного процесу node
    BOT_PID=$(pgrep -f "node.*app.js" | head -1)

    if [ -n "$BOT_PID" ]; then
        # Відправляємо SIGTERM для graceful shutdown
        kill -TERM $BOT_PID

        # Чекаємо до 30 секунд на завершення
        for i in $(seq 1 30); do
            if ! kill -0 $BOT_PID 2>/dev/null; then
                break
            fi
            sleep 1
        done

        # Якщо процес ще працює, примусово завершуємо
        if kill -0 $BOT_PID 2>/dev/null; then
            kill -KILL $BOT_PID
            echo "$(date): Бот завершено примусово" >> $LOG_FILE
        else
            echo "$(date): Бот завершено коректно" >> $LOG_FILE
        fi
    fi

    # Запускаємо бот знову
    cd $APP_DIR
    nohup npm start >> $LOG_FILE 2>&1 &

    echo "$(date): Бот перезапущено" >> $LOG_FILE
}

# Функція для відправки повідомлення про оновлення
send_update_notification() {
    if [ -n "$UPDATE_NOTIFICATION_CHAT_ID" ] && [ -n "$BOT_TOKEN" ]; then
        MESSAGE="🔄 Gryag Bot автоматично оновлено!\n\nЧас: $(date)\nВерсія: $(get_current_version | cut -c1-8)"

        curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
            -H "Content-Type: application/json" \
            -d "{\"chat_id\":\"$UPDATE_NOTIFICATION_CHAT_ID\",\"text\":\"$MESSAGE\",\"parse_mode\":\"HTML\"}" \
            >> $LOG_FILE 2>&1
    fi
}

# Основна логіка
main() {
    echo "$(date): =================================" >> $LOG_FILE
    echo "$(date): Запуск автооновлення" >> $LOG_FILE

    CURRENT_VERSION=$(get_current_version)
    echo "$(date): Поточна версія: $CURRENT_VERSION" >> $LOG_FILE

    # Перевірка наявності оновлень
    UPDATES_AVAILABLE=$(check_for_updates)

    if [ "$UPDATES_AVAILABLE" = "true" ]; then
        echo "$(date): Виявлено оновлення, починаємо процес..." >> $LOG_FILE

        # Створення резервної копії
        backup_database

        # Оновлення коду
        if update_code; then
            # Оновлення залежностей
            if update_dependencies; then
                # Перезапуск бота
                restart_bot

                # Відправка повідомлення про оновлення
                send_update_notification

                NEW_VERSION=$(get_current_version)
                echo "$(date): Оновлення завершено успішно! Нова версія: $NEW_VERSION" >> $LOG_FILE
            else
                echo "$(date): Оновлення скасовано через помилку залежностей" >> $LOG_FILE
                exit 1
            fi
        else
            echo "$(date): Оновлення скасовано через помилку коду" >> $LOG_FILE
            exit 1
        fi
    else
        echo "$(date): Оновлення не потрібні" >> $LOG_FILE
    fi

    echo "$(date): Автооновлення завершено" >> $LOG_FILE
    echo "$(date): =================================" >> $LOG_FILE
}

# Запуск основної функції
main
