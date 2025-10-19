#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ENV_FILE="${ROOT_DIR}/backend/.env.production"
FRONTEND_ENV_FILE="${ROOT_DIR}/frontend/.env.production"

if [[ ! -f "${BACKEND_ENV_FILE}" ]]; then
  echo "❌ Не найден файл ${BACKEND_ENV_FILE}. Создайте его на основе backend/.env.production.example." >&2
  exit 1
fi

if [[ ! -f "${FRONTEND_ENV_FILE}" ]]; then
  echo "❌ Не найден файл ${FRONTEND_ENV_FILE}. Создайте его на основе frontend/.env.production.example." >&2
  exit 1
fi

export NODE_ENV=production
export DOTENV_CONFIG_PATH="${BACKEND_ENV_FILE}"

echo "🏗️  Сборка приложения для продакшена"
cd "${ROOT_DIR}"
npm run build

echo "✅ Backend стартует в продакшен-режиме"
npm run start --workspace backend &
BACKEND_PID=$!

echo "🌐 Frontend запускается через Vite preview (замените на nginx в реальном продакшене)"
npm run preview --workspace frontend -- --host 0.0.0.0 --port 4173 &
FRONTEND_PID=$!

trap 'echo "🛑 Остановка..."; kill ${BACKEND_PID} ${FRONTEND_PID}' SIGINT SIGTERM

wait ${BACKEND_PID} ${FRONTEND_PID}
