# assistantai

## Instagram / Meta подключение

1) Требуется IG Professional (Business/Creator) + привязанная Facebook Page.
2) Создай Meta App → включи Instagram Graph API / Messenger.
3) Получи permissions (App Review): pages_manage_metadata, pages_messaging, instagram_manage_messages, instagram_basic.
4) Сгенерируй Page Access Token (long-lived) и заполни .env:
   PAGE_ACCESS_TOKEN=...
   FB_PAGE_ID=...
   META_VERIFY_TOKEN=...  # любой рандом для подтверждения вебхука
5) Выставь публичный HTTPS-домен и пропиши IG_WEBHOOK_CALLBACK_URL=https://domain/api/ig/webhook
6) Подними сервер, подтверди вебхук:
   GET /api/ig/webhook?hub.mode=subscribe&hub.verify_token=<META_VERIFY_TOKEN>&hub.challenge=123
   → должен вернуть 123
7) Подпиши страницу:
   POST /api/ig/subscribe  (с заголовком Authorization: Bearer <ADMIN_TOKEN>)

## Запуск (dev)
cp .env.example .env   # заполни ключи
pnpm i  &&  (cd server && pnpm i && pnpm prisma:generate && pnpm prisma:migrate)  &&  (cd client && pnpm i)
pnpm -r dev  # или отдельно: npm run dev в client и server

## Запуск (Docker)
docker compose up --build -d
# сервер доступен на :8787 (админ-вкладки требуют токен)
