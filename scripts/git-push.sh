#!/bin/bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "❌ git не найден. Установите Git перед использованием скрипта." >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  echo "Использование: $(basename "$0") \"commit message\"" >&2
  exit 1
fi

COMMIT_MESSAGE="$*"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_ROOT}" ]]; then
  echo "❌ Скрипт нужно запускать внутри git-репозитория." >&2
  exit 1
fi

cd "${REPO_ROOT}"

if [[ -z "$(git status --porcelain)" ]]; then
  echo "ℹ️ Нет изменений для коммита. Репозиторий чист." >&2
  exit 0
fi

BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo main)"
REMOTE="${GIT_REMOTE:-origin}"

echo "🔄 Добавляем изменения..."
git add --all

if git diff --cached --quiet; then
  echo "ℹ️ После git add нет изменений для коммита. Репозиторий чист." >&2
  exit 0
fi

echo "📝 Создаём коммит: ${COMMIT_MESSAGE}"
git commit -m "${COMMIT_MESSAGE}"

echo "🚀 Отправляем в ${REMOTE}/${BRANCH}"
git push "${REMOTE}" "${BRANCH}"

echo "✅ Готово. Не забудьте на сервере выполнить git pull."
