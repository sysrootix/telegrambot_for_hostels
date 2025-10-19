# Hostel Helper Bot

Telegram WebApp бот с админ-панелью для управления профилями жильцов и списком администраторов.

## Стек
- Frontend: React 18 + Vite + TypeScript, Tailwind CSS, Zustand, React Query
- Backend: Node.js 20, Express, Prisma, PostgreSQL, node-telegram-bot-api
- Монорепозиторий на npm workspaces

## Структура
```
.
├── backend/    # Express + Telegram бот + Prisma
├── frontend/   # React WebApp
└── STACK_AND_RULES.md
```

## Быстрый старт
1. Установите зависимости в корне:
   ```bash
   npm install
   ```
2. Заполните `.env` файлы.
3. Примените миграции (см. `backend/prisma/migration-2025-10-19-init.md`).
4. Настройте ngrok (нужен для HTTPS-туннеля в dev):
   ```bash
   brew install ngrok/ngrok/ngrok
   ngrok config add-authtoken <ваш_ngrok_token>
   ```
5. Для разработки используйте скрипт, который автоматически подхватывает `.env.development`, поднимает локальные сервисы и создаёт HTTPS-туннели ngrok:
   ```bash
   npm run start:dev
   ```
   Скрипт выведет публичные `WebApp URL` и `API URL`, которые сразу подставляются в окружение бота и фронтенда.
6. Для локальной проверки production-сборки выполните:
   ```bash
   npm run start:prod
   ```
   Скрипт соберёт фронтенд и бэкенд, запустит бэкенд из `dist/` и поднимет Vite preview (в продакшене замените на nginx).

## Переменные окружения
Создайте файл `backend/.env`:
```
NODE_ENV=development
PORT=4000
BOT_TOKEN=telegram_bot_token
WEBAPP_URL=http://localhost:5173
TELEGRAM_API_BASE_URL=http://api.telegram.org
DATABASE_URL=postgresql://user:password@host:5432/dbname
ADMIN_SEED_CHAT_IDS=123456789,987654321
```

Для фронтенда (`frontend/.env`):
```
VITE_API_BASE_URL=/api
```

Шаблоны для обоих режимов находятся в:
- `backend/.env.development.example`, `backend/.env.production.example`
- `frontend/.env.development.example`, `frontend/.env.production.example`

Скрипт `start:dev` ожидает файлы `.env.development`, `start:prod` — `.env.production`.

## Telegram бот
- При команде `/start` бот отправляет кнопку «Открыть приложение» с `web_app` ссылкой.
- Список администраторов хранится в БД. При старте бэкенда chat_id из `ADMIN_SEED_CHAT_IDS` автоматически заносится в таблицу `Admin`.
- Для всех HTTP запросов фронтенд пересылает `X-Telegram-Init-Data` из Telegram WebApp.
- В dev-режиме (`npm run start:dev`) скрипт автоматически создаёт HTTPS-туннели через ngrok и подставляет их в окружение бота/фронтенда; WebApp открывается по публичному адресу.
- В prod-режиме (`npm run start:prod`) используется основной API Telegram (`https://api.telegram.org`) и подразумевается реальный домен + nginx.

## API
- `GET /api/auth/session` — получить сессию и данные профиля.
- `GET/POST/PUT/DELETE /api/admins` — управление администраторами (только для админов).
- `GET/POST/PUT/DELETE /api/users` — CRUD для пользователей (только для админов).
- `GET/PATCH /api/profile/me` — просмотр и обновление собственного профиля.

## Frontend
- Хеш-маршрутизация (`#/` — профиль, `#/admin` — админ-панель).
- Профиль: редактирование имени, фамилии, username, телефона, био.
- Админка: добавление/редактирование/удаление администраторов и обычных пользователей.

## Миграции
Инструкции в `backend/prisma/migration-2025-10-19-init.md`. Команды выполняются на сервере.

## Тестирование
Тесты пока не реализованы. Перед деплоем стоит добавить модульные тесты для сервисов и компонента админ-панели.

## Продакшен деплой (кратко)
1. Убедитесь, что настроены файлы окружения `backend/.env` и `frontend/.env` (см. пример `.env.production.example`).
2. На сервере подтянуть изменения и выполнить полный деплой (pull → npm install → build → копирование фронта → PM2 reload → prisma migrate deploy):
   ```bash
   cd /path/to/telegrambot_for_hostels
   ./scripts/git-pull.sh
   ```
   Скрипт требует установленные `npm`, `pm2`, `rsync`.
3. Настроить nginx. Пример лежит в `deploy/nginx/bot.sysrootix.com.conf`. Скопируйте файл в `/etc/nginx/sites-available/`, создайте симлинк в `sites-enabled` и перезапустите nginx:
    ```bash
    sudo mkdir -p /var/www/letsencrypt
    sudo cp deploy/nginx/bot.sysrootix.com.conf /etc/nginx/sites-available/bot.sysrootix.com.conf
    sudo ln -s /etc/nginx/sites-available/bot.sysrootix.com.conf /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    ```
4. Выпустить сертификаты Let’s Encrypt (пример для certbot):
    ```bash
    sudo certbot certonly --nginx -d bot.sysrootix.com
    sudo systemctl reload nginx
    ```
5. Проверьте, что WebApp открывается по `https://bot.sysrootix.com`, а API отвечает на `https://bot.sysrootix.com/api/health`.

## Дальшие шаги
- Настроить полноценную авторизацию (JWT / сессии по initData).
- Добавить остальные разделы WebApp (например, заявок, бронирований и т.д.).
- Подключить CI/CD и автоматическое форматирование.
