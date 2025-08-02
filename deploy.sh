#!/bin/bash

# Скрипт для налаштування та запуску Gryag Bot у Docker
# Використання: ./deploy.sh [start|stop|restart|update|logs|status]

set -e

# Конфігурація
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
CONTAINER_NAME="gryag-bot"

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функція для виводу повідомлень
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ПОМИЛКА] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[УВАГА] $1${NC}"
}

info() {
    echo -e "${BLUE}[ІНФО] $1${NC}"
}

# Перевірка наявності Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker не встановлено. Будь ласка, встановіть Docker перед продовженням."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose не встановлено. Будь ласка, встановіть Docker Compose."
        exit 1
    fi
}

# Перевірка наявності .env файлу
check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        warning ".env файл не знайдено. Створюю з шаблону..."

        if [ -f ".env.docker.example" ]; then
            cp .env.docker.example $ENV_FILE
            warning "Будь ласка, відредагуйте $ENV_FILE файл з вашими налаштуваннями"
            error "Запуск неможливий без правильного налаштування .env файлу"
            exit 1
        else
            error "Шаблон .env.docker.example не знайдено"
            exit 1
        fi
    fi
}

# Створення необхідних директорій
setup_directories() {
    log "Створення необхідних директорій..."

    mkdir -p data/backups
    mkdir -p logs

    # Надання прав доступу
    chmod 755 data
    chmod 755 logs

    log "Директорії створено"
}

# Збірка образу
build() {
    log "Збірка Docker образу..."
    docker-compose -f $COMPOSE_FILE build --no-cache
    log "Образ зібрано успішно"
}

# Запуск контейнера
start() {
    check_docker
    check_env
    setup_directories

    log "Запуск Gryag Bot..."

    # Зупинка старого контейнера якщо він працює
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        warning "Зупинка існуючого контейнера..."
        docker-compose -f $COMPOSE_FILE down
    fi

    # Запуск нового контейнера
    docker-compose -f $COMPOSE_FILE up -d

    log "Gryag Bot запущено!"
    info "Використовуйте 'docker-compose logs -f $CONTAINER_NAME' для перегляду логів"
}

# Зупинка контейнера
stop() {
    log "Зупинка Gryag Bot..."
    docker-compose -f $COMPOSE_FILE down
    log "Gryag Bot зупинено"
}

# Перезапуск контейнера
restart() {
    log "Перезапуск Gryag Bot..."
    stop
    sleep 3
    start
}

# Оновлення та перезапуск
update() {
    log "Оновлення Gryag Bot..."

    # Збереження резервної копії бази даних
    if [ -f "data/bot.db" ]; then
        cp data/bot.db "data/backups/bot_manual_backup_$(date +%Y%m%d_%H%M%S).db"
        log "Створено резервну копію бази даних"
    fi

    # Отримання останнього коду
    git pull origin main

    # Перезбірка та перезапуск
    build
    restart

    log "Оновлення завершено!"
}

# Перегляд логів
logs() {
    docker-compose -f $COMPOSE_FILE logs -f $CONTAINER_NAME
}

# Статус контейнера
status() {
    echo
    info "=== Статус Gryag Bot ==="

    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        echo -e "${GREEN}✅ Контейнер працює${NC}"

        # Інформація про контейнер
        docker stats $CONTAINER_NAME --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.PIDs}}"

        # Health check статус
        echo
        HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "unknown")
        case $HEALTH_STATUS in
            "healthy")
                echo -e "${GREEN}💚 Health check: Healthy${NC}"
                ;;
            "unhealthy")
                echo -e "${RED}❤️ Health check: Unhealthy${NC}"
                ;;
            "starting")
                echo -e "${YELLOW}💛 Health check: Starting${NC}"
                ;;
            *)
                echo -e "${BLUE}💙 Health check: Unknown${NC}"
                ;;
        esac

    else
        echo -e "${RED}❌ Контейнер не працює${NC}"
    fi

    # Інформація про образи
    echo
    info "=== Docker образи ==="
    docker images | grep gryag-bot || echo "Образ не знайдено"

    # Використання диска
    echo
    info "=== Використання диска ==="
    du -sh data/ logs/ 2>/dev/null || echo "Директорії не знайдено"
}

# Очищення старих даних
cleanup() {
    warning "Очищення старих даних..."

    # Видалення старих резервних копій (старіше 30 днів)
    find data/backups -name "*.db" -type f -mtime +30 -delete 2>/dev/null || true

    # Очищення старих логів
    find logs -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true

    # Очищення Docker
    docker system prune -f

    log "Очищення завершено"
}

# Резервне копіювання
backup() {
    log "Створення повної резервної копії..."

    BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="backup_$BACKUP_DATE"

    mkdir -p $BACKUP_DIR

    # Копіювання бази даних
    if [ -f "data/bot.db" ]; then
        cp data/bot.db "$BACKUP_DIR/"
    fi

    # Копіювання конфігурації
    cp $ENV_FILE "$BACKUP_DIR/"
    cp $COMPOSE_FILE "$BACKUP_DIR/"

    # Створення архіву
    tar -czf "$BACKUP_DIR.tar.gz" $BACKUP_DIR
    rm -rf $BACKUP_DIR

    log "Резервну копію створено: $BACKUP_DIR.tar.gz"
}

# Головне меню
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    update)
        update
        ;;
    build)
        build
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    cleanup)
        cleanup
        ;;
    backup)
        backup
        ;;
    *)
        echo "Використання: $0 {start|stop|restart|update|build|logs|status|cleanup|backup}"
        echo
        echo "Команди:"
        echo "  start    - Запустити бот"
        echo "  stop     - Зупинити бот"
        echo "  restart  - Перезапустити бот"
        echo "  update   - Оновити код та перезапустити"
        echo "  build    - Зібрати Docker образ"
        echo "  logs     - Показати логи"
        echo "  status   - Показати статус"
        echo "  cleanup  - Очистити старі дані"
        echo "  backup   - Створити резервну копію"
        exit 1
        ;;
esac
