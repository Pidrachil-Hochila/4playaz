# 4PLAYAZ — Архитектура проекта

## Обзор

Интернет-магазин уличной одежды коллабораций DJ XBOX360 и 3.5 PROPOVEDNIK.
Монорепозиторий: `backend/` (Node.js/Express) + `frontend/` (Nuxt 3).

---

## Структура репозитория

```
4playaz/
├── backend/                  # Node.js API сервер
│   ├── server.js             # Главный файл Express
│   ├── payment.js            # ЮKassa платёжный роутер
│   ├── cdek.js               # CDEK доставка
│   ├── data/
│   │   ├── products.json     # Товары (хранятся на сервере, ~122 шт)
│   │   ├── collections.json  # Коллекции
│   │   └── banlist.json      # Заблокированные IP (rate limit)
│   └── uploads/              # Загруженные изображения товаров
│
├── frontend/                 # Nuxt 3 SSR/SSG приложение
│   ├── pages/
│   │   ├── index.vue         # Главная: каталог + корзина + оформление заказа
│   │   ├── zamer.vue         # Страница замеров
│   │   ├── oferta.vue        # Публичная оферта
│   │   ├── payment/
│   │   │   └── success.vue   # Страница успешной оплаты
│   │   └── admin/
│   │       ├── login.vue     # Вход в панель администратора
│   │       ├── index.vue     # Дашборд
│   │       ├── products.vue  # Список товаров
│   │       ├── add.vue       # Добавление товара
│   │       └── edit/[id].vue # Редактирование товара
│   │
│   ├── layouts/
│   │   ├── default.vue       # Шапка + корзина (drawer) + футер
│   │   └── admin.vue         # Боковая панель администратора
│   │
│   ├── composables/
│   │   ├── useApi.ts         # HTTP клиент к backend API
│   │   └── useCart.ts        # Корзина (состояние в памяти)
│   │
│   ├── middleware/
│   │   └── auth.ts           # Защита /admin/** через localStorage JWT
│   │
│   ├── server/api/           # Nuxt server routes (для SSG prerendering)
│   │   ├── products.get.ts   # Читает backend/data/products.json
│   │   └── collections.get.ts# Читает backend/data/collections.json
│   │
│   ├── public/
│   │   ├── favicon.svg       # Фавикон (красная "4" на чёрном)
│   │   └── fonts/            # Шрифт Mellizan
│   │
│   └── nuxt.config.ts        # Конфигурация Nuxt
│
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions: build + deploy to GitHub Pages
│
└── nginx.conf                # Конфиг nginx для боевого сервера
```

---

## Backend (Node.js / Express)

**Файл:** `backend/server.js`  
**Порт:** `3001` (по умолчанию)

### API эндпоинты

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/products` | Список товаров (фильтры: `?category=`, `?clothingType=`) |
| GET | `/api/products/:id` | Один товар |
| GET | `/api/collections` | Список коллекций |
| POST | `/api/admin/login` | Вход (логин + пароль + TOTP) |
| POST | `/api/admin/products` | Добавить товар (auth required) |
| PUT | `/api/admin/products/:id` | Обновить товар (auth required) |
| DELETE | `/api/admin/products/:id` | Удалить товар (auth required) |
| POST | `/api/payment/create` | Создать платёж через ЮKassa |
| GET | `/api/cdek/*` | Проксирование запросов к CDEK |

### Хранилище данных

- Товары: `backend/data/products.json` — JSON-массив объектов
- Коллекции: `backend/data/collections.json` — JSON-массив строк
- Изображения: `backend/uploads/` — файлы в виде `<random-hex>.png`

### Безопасность

- JWT авторизация для /admin/** эндпоинтов
- TOTP (Google Authenticator) для входа — секреты в `backend/data/totp_secrets.json` (не коммитится!)
- Rate limiting: 3 попытки → бан IP на 24ч, хранится в `backend/data/banlist.json`
- Santization всех входных полей

---

## Frontend (Nuxt 3)

**Версия:** Nuxt 3.10, Vue 3.4  
**Режим:** SSR (с SSG для GitHub Pages)

### Режимы работы

**Локальная разработка:**
```bash
cd frontend
npm run dev  # → http://localhost:3000
```
Переменная `NUXT_PUBLIC_API_BASE=http://localhost:3001` в `frontend/.env`.  
Все API-запросы идут напрямую на Node.js backend.

**GitHub Pages (SSG):**
```bash
cd frontend
NUXT_APP_BASE_URL=/4playaz/ NUXT_PUBLIC_API_BASE="" npm run generate
```
- `nuxt generate` запускает Nitro-сервер и пре-рендерит страницы
- Маршруты `/api/products` и `/api/collections` пре-рендерятся как статические JSON-файлы
- Статика выгружается в `.output/public/`
- `/admin/**` страницы остаются SPA (client-only) через `routeRules`

### Как работает `useApi.ts`

```ts
const apiBase = config.public.apiBase     // '' на GitHub Pages
const appBase = config.app.baseURL        // '/4playaz' на GitHub Pages
const base = apiBase || appBase           // 'http://localhost:3001' или '/4playaz'

$fetch(`${base}/api/products`)
// Локально: http://localhost:3001/api/products  → backend
// GitHub Pages: /4playaz/api/products           → статический JSON файл
```

### Корзина (`useCart.ts`)

Состояние корзины живёт в модульных `ref()` переменных (не Pinia, не localStorage).  
Корзина сбрасывается при перезагрузке страницы. Это намеренно — для простоты.

### Оформление заказа (index.vue)

1. Пользователь добавляет товар в корзину (через inject из default layout)
2. Открывает checkout drawer с формой (ФИО, email, адрес, доставка CDEK)
3. При сабмите вызывается `POST /api/payment/create` → ЮKassa API
4. Редирект на страницу оплаты ЮKassa
5. После оплаты ЮKassa редиректит на `/payment/success`

**⚠️ На GitHub Pages оформление заказа не работает** — требует backend.

---

## GitHub Pages деплой

**URL:** https://pidrachil-hochila.github.io/4playaz/

**Workflow:** `.github/workflows/deploy.yml`

```
push to main
  → npm ci (в frontend/)
  → nuxt generate (с NUXT_APP_BASE_URL=/4playaz/ и NUXT_PUBLIC_API_BASE="")
      └─ Nitro prerender /api/products → .output/public/api/products (JSON)
      └─ Nitro prerender /api/collections → .output/public/api/collections (JSON)
      └─ Все страницы SSR → .output/public/
  → upload-pages-artifact (.output/public/)
  → deploy-pages
```

### Что работает на GitHub Pages

| Функция | Статус |
|---|---|
| Просмотр каталога товаров | ✅ |
| Фильтрация по категории/типу одежды | ✅ |
| Карусель новинок | ✅ (если есть товары с badge=New) |
| Страница замеров | ✅ |
| Публичная оферта | ✅ |
| Оформление заказа / оплата | ❌ (нужен backend + ЮKassa) |
| Доставка CDEK | ❌ (нужен backend) |
| Изображения товаров | ❌ (хранятся на сервере в backend/uploads/) |
| Админ-панель | ❌ (нужен backend для auth и CRUD) |

---

## Переменные окружения

### `frontend/.env` (локальная разработка, не коммитится)

```env
NUXT_PUBLIC_API_BASE=http://localhost:3001   # URL backend API
NUXT_PUBLIC_YANDEX_API_KEY=                 # Яндекс Maps API ключ
NUXT_PUBLIC_CDEK_SERVICE_PATH=              # URL к CDEK service.php
```

### `backend/.env` (не коммитится, пример в `backend/.env.example`)

```env
JWT_SECRET=...                              # Секрет для JWT токенов
ADMIN_ADMIN_PASSWORD=...                    # Пароль администратора
TOTP_SECRET_ADMIN=...                       # TOTP base32 ключ
PORT=3001
YUKASSA_SHOP_ID=...
YUKASSA_SECRET_KEY=...
```

---

## Что было изменено при деплое на GitHub Pages

### Commit 1 (первоначальный деплой)
- Инициализация git, создан репозиторий `Pidrachil-Hochila/4playaz`
- `nuxt.config.ts`: добавлен `ssr: false` и `app.baseURL` из env
- Создан `.github/workflows/deploy.yml`
- Добавлен `.gitignore` для `backend/data/totp_secrets.json` и `.claude/`

### Commit 2 (исправление ошибок SSG)
- `nuxt.config.ts`: убран `ssr: false` → включён полноценный SSR для prerender; добавлены `routeRules` (admin SPA) и `nitro.prerender.routes`
- Созданы `frontend/server/api/products.get.ts` и `collections.get.ts` — читают `backend/data/*.json` для prerendering
- `useApi.ts`: fallback на `app.baseURL` когда `apiBase` пустой
- `index.vue`: `useRoute()` перенесён до `onMounted` (fix TypeError после await); `resolveImg` возвращает `''` для `/uploads/` в static-режиме; `newProducts` computed использует `resolveImg()`
- `layouts/default.vue`: `/zamer` href заменён на `NuxtLink` (корректно работает с baseURL)
- Добавлен `frontend/public/favicon.svg`
- `workflow`: `NUXT_PUBLIC_API_BASE: ""` вместо secrets reference

---

## Боевой сервер (VPS/nginx)

`nginx.conf` настроен для работы с обоими компонентами:
- Статика Nuxt: `proxy_pass http://localhost:3000`
- Backend API: `proxy_pass http://localhost:3001`
- Загруженные файлы: `alias /var/www/4playaz/backend/uploads/`

Для боевого деплоя на VPS:
```bash
# Backend
cd backend && npm install
cp .env.example .env && nano .env  # заполнить секреты
node server.js  # или pm2 start server.js

# Frontend
cd frontend && npm install
NUXT_PUBLIC_API_BASE=https://4playaz.ru npm run build
node .output/server/index.mjs  # или pm2
```
