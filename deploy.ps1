# PowerShell скрипт для управління Gryag Bot Docker контейнером
# Використання: .\deploy.ps1 [start|stop|restart|update|logs|status]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "restart", "update", "logs", "status", "build", "cleanup", "backup")]
    [string]$Action
)

# Конфігурація
$ComposeFile = "docker-compose.yml"
$EnvFile = ".env"
$ContainerName = "gryag-bot"

# Функції для виводу кольорових повідомлень
function Write-Success($Message) {
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor Green
}

function Write-Error($Message) {
    Write-Host "[ПОМИЛКА] $Message" -ForegroundColor Red
}

function Write-Warning($Message) {
    Write-Host "[УВАГА] $Message" -ForegroundColor Yellow
}

function Write-Info($Message) {
    Write-Host "[ІНФО] $Message" -ForegroundColor Cyan
}

# Перевірка наявності Docker
function Test-Docker {
    try {
        $null = Get-Command docker -ErrorAction Stop
        $null = Get-Command docker-compose -ErrorAction Stop
    }
    catch {
        Write-Error "Docker або Docker Compose не встановлено. Будь ласка, встановіть їх перед продовженням."
        exit 1
    }
}

# Перевірка наявності .env файлу
function Test-EnvFile {
    if (-not (Test-Path $EnvFile)) {
        Write-Warning ".env файл не знайдено. Створюю з шаблону..."

        if (Test-Path ".env.docker.example") {
            Copy-Item ".env.docker.example" $EnvFile
            Write-Warning "Будь ласка, відредагуйте $EnvFile файл з вашими налаштуваннями"
            Write-Error "Запуск неможливий без правильного налаштування .env файлу"
            exit 1
        }
        else {
            Write-Error "Шаблон .env.docker.example не знайдено"
            exit 1
        }
    }
}

# Створення необхідних директорій
function Initialize-Directories {
    Write-Success "Створення необхідних директорій..."

    $null = New-Item -ItemType Directory -Force -Path "data\backups"
    $null = New-Item -ItemType Directory -Force -Path "logs"

    Write-Success "Директорії створено"
}

# Збірка образу
function Build-Image {
    Write-Success "Збірка Docker образу..."
    & docker-compose -f $ComposeFile build --no-cache
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Образ зібрано успішно"
    } else {
        Write-Error "Помилка збірки образу"
        exit 1
    }
}

# Запуск контейнера
function Start-Bot {
    Test-Docker
    Test-EnvFile
    Initialize-Directories

    Write-Success "Запуск Gryag Bot..."

    # Зупинка старого контейнера якщо він працює
    $existingContainer = docker ps -q -f name=$ContainerName
    if ($existingContainer) {
        Write-Warning "Зупинка існуючого контейнера..."
        & docker-compose -f $ComposeFile down
    }

    # Запуск нового контейнера
    & docker-compose -f $ComposeFile up -d

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Gryag Bot запущено!"
        Write-Info "Використовуйте 'docker-compose logs -f $ContainerName' для перегляду логів"
    } else {
        Write-Error "Помилка запуску контейнера"
        exit 1
    }
}

# Зупинка контейнера
function Stop-Bot {
    Write-Success "Зупинка Gryag Bot..."
    & docker-compose -f $ComposeFile down

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Gryag Bot зупинено"
    } else {
        Write-Error "Помилка зупинки контейнера"
    }
}

# Перезапуск контейнера
function Restart-Bot {
    Write-Success "Перезапуск Gryag Bot..."
    Stop-Bot
    Start-Sleep -Seconds 3
    Start-Bot
}

# Оновлення та перезапуск
function Update-Bot {
    Write-Success "Оновлення Gryag Bot..."

    # Збереження резервної копії бази даних
    if (Test-Path "data\bot.db") {
        $backupName = "bot_manual_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
        Copy-Item "data\bot.db" "data\backups\$backupName"
        Write-Success "Створено резервну копію бази даних"
    }

    # Отримання останнього коду
    & git pull origin main

    if ($LASTEXITCODE -eq 0) {
        # Перезбірка та перезапуск
        Build-Image
        Restart-Bot
        Write-Success "Оновлення завершено!"
    } else {
        Write-Error "Помилка оновлення коду з Git"
        exit 1
    }
}

# Перегляд логів
function Show-Logs {
    & docker-compose -f $ComposeFile logs -f $ContainerName
}

# Статус контейнера
function Show-Status {
    Write-Info "=== Статус Gryag Bot ==="

    $container = docker ps -q -f name=$ContainerName
    if ($container) {
        Write-Success "✅ Контейнер працює"

        # Інформація про контейнер
        Write-Info "`n=== Статистика ресурсів ==="
        & docker stats $ContainerName --no-stream --format "table {{.Container}}`t{{.CPUPerc}}`t{{.MemUsage}}`t{{.NetIO}}`t{{.PIDs}}"

        # Health check статус
        try {
            $healthStatus = docker inspect --format='{{.State.Health.Status}}' $ContainerName 2>$null
            Write-Info "`n=== Health Check ==="
            switch ($healthStatus) {
                "healthy" { Write-Success "💚 Health check: Healthy" }
                "unhealthy" { Write-Error "❤️ Health check: Unhealthy" }
                "starting" { Write-Warning "💛 Health check: Starting" }
                default { Write-Info "💙 Health check: Unknown" }
            }
        }
        catch {
            Write-Info "💙 Health check: Unknown"
        }
    }
    else {
        Write-Error "❌ Контейнер не працює"
    }

    # Інформація про образи
    Write-Info "`n=== Docker образи ==="
    $images = docker images | Select-String "gryag-bot"
    if ($images) {
        $images | ForEach-Object { Write-Host $_.Line }
    } else {
        Write-Host "Образ не знайдено"
    }

    # Використання диска
    Write-Info "`n=== Використання диска ==="
    if (Test-Path "data") {
        $dataSize = (Get-ChildItem -Recurse "data" | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "data/: $([math]::Round($dataSize, 2)) MB"
    }
    if (Test-Path "logs") {
        $logsSize = (Get-ChildItem -Recurse "logs" | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "logs/: $([math]::Round($logsSize, 2)) MB"
    }
}

# Очищення старих даних
function Start-Cleanup {
    Write-Warning "Очищення старих даних..."

    # Видалення старих резервних копій (старіше 30 днів)
    $oldBackups = Get-ChildItem -Path "data\backups" -Filter "*.db" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) }
    if ($oldBackups) {
        $oldBackups | Remove-Item -Force
        Write-Success "Видалено $($oldBackups.Count) старих резервних копій"
    }

    # Очищення старих логів
    $oldLogs = Get-ChildItem -Path "logs" -Filter "*.log" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }
    if ($oldLogs) {
        $oldLogs | Remove-Item -Force
        Write-Success "Видалено $($oldLogs.Count) старих файлів логів"
    }

    # Очищення Docker
    & docker system prune -f

    Write-Success "Очищення завершено"
}

# Резервне копіювання
function Start-Backup {
    Write-Success "Створення повної резервної копії..."

    $backupDate = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupDir = "backup_$backupDate"

    $null = New-Item -ItemType Directory -Force -Path $backupDir

    # Копіювання бази даних
    if (Test-Path "data\bot.db") {
        Copy-Item "data\bot.db" "$backupDir\"
    }

    # Копіювання конфігурації
    Copy-Item $EnvFile "$backupDir\"
    Copy-Item $ComposeFile "$backupDir\"

    # Створення архіву
    Compress-Archive -Path $backupDir -DestinationPath "$backupDir.zip" -Force
    Remove-Item -Recurse -Force $backupDir

    Write-Success "Резервну копію створено: $backupDir.zip"
}

# Виконання команди
switch ($Action) {
    "start" { Start-Bot }
    "stop" { Stop-Bot }
    "restart" { Restart-Bot }
    "update" { Update-Bot }
    "build" { Build-Image }
    "logs" { Show-Logs }
    "status" { Show-Status }
    "cleanup" { Start-Cleanup }
    "backup" { Start-Backup }
    default {
        Write-Host "Невідома команда: $Action" -ForegroundColor Red
        Write-Host "`nВикористання: .\deploy.ps1 {start|stop|restart|update|build|logs|status|cleanup|backup}"
        exit 1
    }
}
