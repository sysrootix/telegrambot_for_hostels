#!/bin/bash
set -euo pipefail

REQUIRED_CMDS=("git" "npm" "pm2" "rsync")
for cmd in "${REQUIRED_CMDS[@]}"; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "❌ Требуется команда '${cmd}'. Установите её перед запуском." >&2
    exit 1
  fi
done

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_ROOT}" ]]; then
  echo "❌ Скрипт нужно запускать внутри git-репозитория." >&2
  exit 1
fi

cd "${REPO_ROOT}"

BACKEND_ENV_FILE="${REPO_ROOT}/backend/.env.production"
FRONTEND_ENV_FILE="${REPO_ROOT}/frontend/.env.production"
if [[ ! -f "${BACKEND_ENV_FILE}" ]]; then
  echo "❌ Не найден файл ${BACKEND_ENV_FILE}. Создайте его на основе backend/.env.production.example." >&2
  exit 1
fi
if [[ ! -f "${FRONTEND_ENV_FILE}" ]]; then
  echo "❌ Не найден файл ${FRONTEND_ENV_FILE}. Создайте его на основе frontend/.env.production.example." >&2
  exit 1
fi

BRANCH="${GIT_BRANCH:-$(git symbolic-ref --short HEAD 2>/dev/null || echo main)}"
REMOTE="${GIT_REMOTE:-origin}"
WEB_ROOT="/var/www/bot-helper-for-hostel/frontend"
PM2_APP_NAME="${PM2_APP_NAME:-hostel-bot-backend}"
PM2_ENTRY="${PM2_ENTRY:-backend/dist/server.js}"

echo "🔍 Обновляем репозиторий (${REMOTE}/${BRANCH})..."
git fetch "${REMOTE}" --prune
git pull --ff-only "${REMOTE}" "${BRANCH}"

echo "📦 Устанавливаем зависимости (npm install)..."
npm install

echo "🛠️  Сборка backend..."
npm run build --workspace backend

echo "🛠️  Сборка frontend..."
npm run build --workspace frontend

echo "📁 Деплой фронтенда в ${WEB_ROOT}..."
mkdir -p "${WEB_ROOT}"
rsync -a --delete frontend/dist/ "${WEB_ROOT}/"

echo "🚀 Обновляем PM2 процесс (${PM2_APP_NAME})..."
export NODE_ENV=production
export DOTENV_CONFIG_PATH="${BACKEND_ENV_FILE}"
if pm2 describe "${PM2_APP_NAME}" >/dev/null 2>&1; then
  pm2 reload "${PM2_APP_NAME}" --update-env
else
  pm2 start "${PM2_ENTRY}" --name "${PM2_APP_NAME}" --update-env
fi
pm2 save

echo "🗄️  Применяем миграции Prisma..."
cd backend
npx prisma migrate deploy
cd "${REPO_ROOT}"

echo "✅ Деплой завершён. Текущая ревизия:"
git --no-pager log -1 --oneline

echo "ℹ️ Prisma migrate deploy выполнен автоматически."
