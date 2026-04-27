# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## SSH
root@89.108.81.147 ; pass = xYyEIOkEbxCk51ZO


## Project Overview

**4PLAYAZ** — интернет-магазин одежды (streetwear). Монорепо:
- **Backend**: Node.js/Express (порт 4000 на проде, 3001 локально) — продукты, оплата ЮKassa, доставка CDEK, TOTP 2FA
- **Frontend**: Nuxt 3 SPA (порт 3000) — SSG на GitHub Pages, SSR на VPS
- **Данные**: продукты/коллекции в JSON-файлах, заказы в Supabase, картинки в `backend/uploads/`

## Commands

### Frontend
```bash
cd frontend
npm run dev          # dev-сервер http://localhost:3000
npm run generate     # SSG для GitHub Pages
npm run build        # SSR-сборка для VPS
npm run preview      # предпросмотр production
```

### Backend
```bash
cd backend
npm run dev          # nodemon (авто-перезапуск)
npm start            # production
```

### Локальная разработка
Сначала запустить backend (3001), потом frontend. В `frontend/.env`:
```
NUXT_PUBLIC_API_BASE=http://localhost:3001
```

## Architecture

### Структура данных
- `backend/data/products.json` — ~120 продуктов, читаются в память при старте
- `backend/data/collections.json` — категории (DJ XBOX360, 3.5 PROPOVEDNIK)
- `backend/data/banlist.json` — IP-баны после 3 неверных попыток входа (24ч)
- `backend/data/totp_secrets.json` — секреты TOTP (gitignored)
- `backend/uploads/` — изображения (base64 → random hex filename)

### API Routes

**Публичные:**
- `GET /api/products` — список (`?category=`, `?clothingType=`)
- `GET /api/products/:id` — один продукт
- `GET /api/collections` — категории
- `POST /api/payment/create` — создать платёж ЮKassa + сохранить заказ в Supabase
- `POST /api/payment/webhook` — колбэк от ЮKassa (отметить заказ paid)
- `POST /api/cdek/calculate` — расчёт стоимости доставки
- `GET /api/cdek/city?q=...` — поиск города CDEK

**Админ (JWT Bearer):**
- `POST /api/admin/login` — логин (пароль + TOTP → JWT 12ч)
- `POST/PUT/DELETE /api/admin/products` — CRUD продуктов
- `GET /api/admin/setup-totp/:username` — первичная настройка TOTP (одноразово)
- `GET /api/orders`, `POST /api/orders/:id/send-link` — заказы

### Auth Flow
1. Логин: username + password + 6-значный TOTP-код (Google Authenticator)
2. Backend: проверяет пароль → verifies TOTP через `speakeasy` → выдаёт JWT
3. Frontend хранит JWT в `localStorage`, отправляет как `Authorization: Bearer <token>`
4. Middleware `frontend/middleware/auth.ts` защищает `/admin/**`

### Frontend: ключевые composables
- **`useApi.ts`**: HTTP-клиент; `getBase()` возвращает `http://localhost:3001` локально или `/4playaz` на GitHub Pages. Использует нативный `fetch` + `text()` + `JSON.parse()` (обход проблемы Content-Type на GitHub Pages, где JSON отдаётся как `octet-stream`)
- **`useCart.ts`**: in-memory `ref<CartItem[]>` — состояние НЕ сохраняется в localStorage, сбрасывается при перезагрузке

### Nuxt Config
- `ssr: false` — SPA-режим (избегает hydration-проблем)
- `nitro.prerender.routes: ['/api/products', '/api/collections']` — пре-рендер API как статические JSON для GitHub Pages
- CI копирует `backend/data/*.json` и `backend/uploads/` в `.output/public/` при деплое

## GitHub Pages vs VPS

| Функция | GitHub Pages | VPS |
|---|---|---|
| Каталог, фильтры | ✅ (статический JSON) | ✅ |
| Оплата, заказы | ❌ | ✅ |
| Админ-панель | ❌ | ✅ |

**Деплой на GitHub Pages**: `git push origin main` → CI автоматически собирает и публикует.

## Environment Variables

**`backend/.env`** (см. `.env.example`):
```
JWT_SECRET=
ADMIN_<NAME>_PASSWORD=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
CDEK_CLIENT_ID=
CDEK_CLIENT_SECRET=
SITE_URL=https://4playaz.ru
PORT=4000
```

**`frontend/.env`**:
```
NUXT_PUBLIC_API_BASE=https://api.4playaz.ru
```

## Security Notes

- Path traversal защита при удалении изображений: проверяется, что resolved path находится внутри `backend/uploads/`
- Whitelist допустимых badges и clothingType на стороне сервера
- Base64 изображения: строгий regex, лимит 10MB, рандомное имя файла
- TOTP-секреты хранятся в `totp_secrets.json` (gitignored), не в `.env`

## Key Files

- **`backend/server.js`** — основной Express-сервер; логин + rate limit + TOTP (строки ~276–338)
- **`backend/payment.js`** — ЮKassa: создание платежа + webhook
- **`backend/orders.js`** — CRUD заказов в Supabase
- **`frontend/pages/index.vue`** — каталог + корзина + форма чекаута (большой компонент)
- **`frontend/composables/useApi.ts`** — весь HTTP-слой фронтенда
- **`PROJECT_NOTES.md`** — детальная архитектура на русском
- **`INTEGRATION_GUIDE.md`** — настройка ЮKassa + Supabase
- **`DEPLOY.md`** — деплой на VPS (PM2 + Nginx)

