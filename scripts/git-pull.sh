#!/bin/bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "❌ git не найден. Установите Git перед использованием скрипта." >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_ROOT}" ]]; then
  echo "❌ Скрипт нужно запускать внутри git-репозитория." >&2
  exit 1
fi

cd "${REPO_ROOT}"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
REMOTE="${GIT_REMOTE:-origin}"

echo "🔍 Тянем изменения из ${REMOTE}/${BRANCH}..."
git fetch "${REMOTE}" --prune
git pull --ff-only "${REMOTE}" "${BRANCH}"

echo "✅ Репозиторий обновлён. Текущая ревизия:"
git --no-pager log -1 --oneline

echo "ℹ️ При необходимости запустите npm install / build / pm2 restart вручную."
