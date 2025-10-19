#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ENV_FILE="${ROOT_DIR}/backend/.env.development"
FRONTEND_ENV_FILE="${ROOT_DIR}/frontend/.env.development"
BACKEND_PORT="${DEV_BACKEND_PORT:-4000}"
FRONTEND_PORT="${DEV_FRONTEND_PORT:-5173}"

if [[ ! -f "${BACKEND_ENV_FILE}" ]]; then
  echo "❌ Не найден файл ${BACKEND_ENV_FILE}. Создайте его на основе backend/.env.development.example." >&2
  exit 1
fi

if [[ ! -f "${FRONTEND_ENV_FILE}" ]]; then
  echo "❌ Не найден файл ${FRONTEND_ENV_FILE}. Создайте его на основе frontend/.env.development.example." >&2
  exit 1
fi

if ! command -v ngrok >/dev/null 2>&1; then
  echo "❌ Команда ngrok не найдена. Установите её и выполните ngrok config add-authtoken ..." >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ Python 3 обязателен для парсинга ответов ngrok." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "❌ curl обязателен для взаимодействия с локальным API ngrok." >&2
  exit 1
fi

TMP_NGROK_CONFIG="$(mktemp)"
TMP_NGROK_LOG="$(mktemp)"

cleanup() {
  if [[ -n "${NGROK_PID:-}" ]]; then
    kill "${NGROK_PID}" >/dev/null 2>&1 || true
    wait "${NGROK_PID}" >/dev/null 2>&1 || true
  fi
  rm -f "${TMP_NGROK_CONFIG}" "${TMP_NGROK_LOG}"
}

trap cleanup EXIT INT TERM

cat >"${TMP_NGROK_CONFIG}" <<EOF
version: "2"
tunnels:
  frontend:
    proto: http
    addr: ${FRONTEND_PORT}
  backend:
    proto: http
    addr: ${BACKEND_PORT}
EOF

ngrok start --config "${TMP_NGROK_CONFIG}" --all --log=stdout --log-format=json >"${TMP_NGROK_LOG}" &
NGROK_PID=$!

extract_ngrok_urls() {
  python3 <<'PY'
import json, sys
data = sys.stdin.read()
try:
    payload = json.loads(data)
except json.JSONDecodeError:
    payload = {}
def pick(name):
    for tunnel in payload.get("tunnels", []):
        url = tunnel.get("public_url", "")
        if tunnel.get("name") == name and url.startswith("https://"):
            return url
    return ""
print(pick("frontend"))
print(pick("backend"))
PY
}

FRONTEND_URL=""
BACKEND_URL=""

for attempt in {1..60}; do
  sleep 1
  JSON=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null || true)
  if [[ -z "${JSON}" ]]; then
    continue
  fi
  urls=$(printf '%s' "${JSON}" | extract_ngrok_urls)
  FRONTEND_URL=$(printf '%s\n' "${urls}" | sed -n '1p')
  BACKEND_URL=$(printf '%s\n' "${urls}" | sed -n '2p')
  if [[ -n "${FRONTEND_URL}" && -n "${BACKEND_URL}" ]]; then
    break
  fi
done

if [[ -z "${FRONTEND_URL}" || -z "${BACKEND_URL}" ]]; then
  echo "❌ Не удалось получить публичные URL от ngrok. Проверьте лог ${TMP_NGROK_LOG} и убедитесь, что authtoken настроен." >&2
  exit 1
fi

export NODE_ENV=development
export DOTENV_CONFIG_PATH="${BACKEND_ENV_FILE}"
export WEBAPP_URL="${FRONTEND_URL}"
export VITE_API_BASE_URL="${BACKEND_URL}/api"

echo "🚀 Запуск dev-режима с ngrok туннелями"
echo "  • Backend env: ${BACKEND_ENV_FILE}"
echo "  • Frontend env: ${FRONTEND_ENV_FILE}"
echo "  • WebApp URL: ${WEBAPP_URL}"
echo "  • API URL: ${VITE_API_BASE_URL}"
echo "  • ngrok PID: ${NGROK_PID}"

cd "${ROOT_DIR}"
npm run dev
