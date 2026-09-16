#!/usr/bin/env bash
cd "$(dirname "$0")"

# 1. Проверка Python venv
if [ ! -d "venv" ]; then
    echo "📦 Инициализация Python окружения..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
fi

# 2. Проверка сборки React
if [ ! -d "frontend/dist" ]; then
    echo "⚛️ Сборка React фронтенда..."
    if [ ! -d "frontend/node_modules" ]; then
        (cd frontend && npm install)
    fi
    (cd frontend && npm run build)
fi

echo "================================================================="
echo "   🚀 Kapas — Аналитическая платформа Kaspi успешно запущена!"
echo ""
echo "   🌐 Веб-интерфейс:   http://localhost:8000"
echo "   🎨 Для разработки React (Hot Reload): cd frontend && npm run dev"
echo "================================================================="

./venv/bin/python -m uvicorn app:app --host 0.0.0.0 --port 8000
