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
npm run dev       # dev-сервер http://localhost:3000 (0.0.0.0 — доступен по сети через TUN/VPN)
npm run generate  # SSG для GitHub Pages
npm run build     # SSR-сборка для VPS
```

### Backend
```bash
cd backend
npm run dev   # nodemon
npm start     # production
```

### Локальная разработка
Запустить backend (порт 3001), потом frontend. В `frontend/.env`:
```
NUXT_PUBLIC_API_BASE=http://localhost:3001
```

## Deploy на VPS

**На VPS нет git-репозитория.** Деплой всегда вручную:

```powershell
# 1. Загрузить изменённые файлы
pscp -pw xYyEIOkEbxCk51ZO "frontend/pages/index.vue" root@89.108.81.147:/var/www/4playaz/frontend/pages/index.vue

# 2. Пересобрать фронтенд на VPS
plink -pw xYyEIOkEbxCk51ZO root@89.108.81.147 "cd /var/www/4playaz/frontend && npm run build 2>&1 | tail -5"

# 3. Перезапустить
plink -pw xYyEIOkEbxCk51ZO root@89.108.81.147 "pm2 restart 4playaz-frontend --silent"
```

**Критично:** `NUXT_PUBLIC_API_BASE` на VPS должна быть пустой строкой (`""`). Если там `http://localhost:3001` — фронт сломается (CORS). Nginx сам проксирует `/api/` → backend:3001.

PM2 процессы: `4playaz-backend` (порт 3001), `4playaz-frontend` (порт 3000).

**Синхронизация данных перед редеплоем** — если на VPS были добавлены товары через админку, сначала скачать актуальные данные:
```powershell
pscp -pw xYyEIOkEbxCk51ZO root@89.108.81.147:/var/www/4playaz/backend/data/products.json backend/data/products.json
pscp -pw xYyEIOkEbxCk51ZO root@89.108.81.147:/var/www/4playaz/backend/data/collections.json backend/data/collections.json
```

## Architecture

### Структура данных
- `backend/data/products.json` — ~120 продуктов, читаются в память при старте
- `backend/data/collections.json` — категории (DJ XBOX360, 3.5 PROPOVEDNIK, MEMPHIS)
- `backend/data/banlist.json` — IP-баны после 3 неверных попыток входа (24ч)
- `backend/data/totp_secrets.json` — секреты TOTP (gitignored)
- `backend/uploads/` — изображения (base64 → random hex filename, лимит 10MB)

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
- `POST /api/admin/login` — пароль + TOTP → JWT 12ч
- `POST/PUT/DELETE /api/admin/products` — CRUD продуктов
- `POST /api/admin/collections` — создать коллекцию; возвращает `{ name, linkedCount }` (число автоматически привязанных товаров)
- `GET /api/orders`, `POST /api/orders/:id/send-link` — заказы

### Auth Flow
1. Логин: username + password + 6-значный TOTP (Google Authenticator)
2. Backend проверяет пароль → TOTP через `speakeasy` → JWT
3. Frontend хранит JWT в `localStorage`, отправляет как `Authorization: Bearer <token>`
4. `frontend/middleware/auth.ts` защищает `/admin/**`

### Frontend: ключевые composables

**`useApi.ts`** — HTTP-клиент. `getBase()` возвращает `http://localhost:3001` локально или пустую строку на VPS. Использует нативный `fetch` + `text()` + `JSON.parse()` (обход проблемы Content-Type на GitHub Pages, где JSON отдаётся как `octet-stream`).

**`useCart.ts`** — in-memory корзина. Состояние **не** сохраняется в localStorage. Идентификатор позиции — составной `cartKey = \`${id}-${size}\`` (не просто id), чтобы один товар в разных размерах считался отдельными позициями.

### Выбор размеров (index.vue)

Размерные сетки по `clothingType`:
- `tshirt`: S M L XL 2XL 3XL
- `hoodie` (обычный): XS S M L XL 2XL
- `hoodie` (оверсайз): S M L XL 2XL 3XL
- `longsleeve`: S M L XL 2XL

Для худи в модалке сначала выбирается тип (Обычный / Оверсайз), затем появляются размеры. Оверсайз сохраняется в корзине как `"Оверсайз L"` (т.е. размер включает тип).

### Страницы админки

| Маршрут | Файл | Назначение |
|---|---|---|
| `/admin/edit` | `pages/admin/edit.vue` | Редактирование без id в URL (устаревший маршрут) |
| `/admin/edit/:id` | `pages/admin/edit/[id].vue` | Основная страница редактирования |

Оба файла существуют и оба регистрируются роутером Nuxt. Ссылка из `products.vue` ведёт на `/admin/edit/${p.id}`. Коллекции в обоих файлах загружаются динамически с `GET /api/collections`.

### Supabase

Таблица `customers` — заказы. Ключевые колонки: `product_name`, `product_size` (размер + тип, например «Оверсайз L»), `product_price`, `delivery_method`, `delivery_address`, `status` (`wait`/`sent`/`paid`).

**Edge Function `notify-paid-order`** (Deno/TypeScript) — отправляет HTML-письмо через Resend API при создании/оплате заказа. Исходник хранится в `edge.md`. Получатели захардкожены в функции. Триггер — database webhook из Supabase.

### Nuxt Config
- `ssr: false` — SPA-режим
- `devServer: { host: '0.0.0.0' }` — доступен по сети (нужно для разработки через TUN/VPN)
- `nitro.prerender.routes: ['/api/products', '/api/collections']` — статические JSON для GitHub Pages
- CI (`/.github/workflows/`) копирует `backend/data/*.json` и `backend/uploads/` в `.output/public/` при деплое на GitHub Pages

## GitHub Pages vs VPS

| Функция | GitHub Pages | VPS |
|---|---|---|
| Каталог, фильтры | ✅ статический JSON | ✅ |
| Оплата, заказы | ❌ | ✅ |
| Админ-панель | ❌ | ✅ |

**Деплой на GitHub Pages**: `git push origin main` → CI собирает и публикует автоматически.

## Environment Variables

**`backend/.env`**:
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

**`frontend/.env`** (на VPS — пустая строка):
```
NUXT_PUBLIC_API_BASE=https://api.4playaz.ru
```

## Security Notes

- Path traversal защита при удалении изображений: resolved path проверяется внутри `backend/uploads/`
- Whitelist допустимых `badges` и `clothingType` на стороне сервера
- Base64 изображения: строгий regex, лимит 10MB, рандомное hex-имя файла
- TOTP-секреты в `totp_secrets.json` (gitignored)
- Nginx: `client_max_body_size` нужно проверить при проблемах 413 при загрузке изображений

## Key Files

- **`backend/server.js`** — Express-сервер: логин + rate limit + TOTP (~строки 276–338), CRUD продуктов
- **`backend/payment.js`** — ЮKassa: создание платежа + webhook
- **`backend/orders.js`** — CRUD заказов в Supabase
- **`frontend/pages/index.vue`** — каталог + поиск + модалка товара + корзина + чекаут (главный компонент, ~1000 строк)
- **`frontend/layouts/default.vue`** — шапка + drawer-корзина + форма оформления заказа
- **`frontend/layouts/admin.vue`** — sidebar-навигация админки (адаптивная)
- **`frontend/composables/useApi.ts`** — весь HTTP-слой фронтенда
- **`frontend/composables/useCart.ts`** — корзина с cartKey
- **`edge.md`** — исходник Supabase Edge Function `notify-paid-order`
- **`PROJECT_NOTES.md`** — детальная архитектура
