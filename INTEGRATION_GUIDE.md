# 4PLAYAZ — Полная инструкция по интеграции

## Что было сделано

- ✅ Кнопки «Написать в TG» заменены на «Купить»
- ✅ Форма оформления заказа (ФИО, телефон, email)
- ✅ Выбор доставки: СДЭК / Почта России / Яндекс Маркет
- ✅ Выбор типа: пункт выдачи или курьер (с адресом)
- ✅ Чекбокс договора оферты (кнопка «Купить» заблокирована до принятия)
- ✅ Страница оферты `/oferta`
- ✅ Интеграция с ЮКасса (создание платежа, вебхук)
- ✅ Supabase — сохранение ФИО, телефона, email
- ✅ Страница успешной оплаты `/payment/success`

---

## Шаг 1 — Supabase

### 1.1 Создай аккаунт и проект
1. Зайди на https://supabase.com → Sign Up
2. «New project» → заполни название (например: `4playaz`) и пароль БД
3. Выбери регион: **eu-central-1** (Frankfurt) — ближайший к России

### 1.2 Создай таблицу
1. Зайди в **SQL Editor** (боковая панель)
2. Вставь содержимое файла `backend/supabase_schema.sql`
3. Нажми **Run**

### 1.3 Скопируй ключи
1. Зайди в **Project Settings → API**
2. Скопируй:
   - **Project URL** → `SUPABASE_URL` в `.env`
   - **service_role secret** (не anon!) → `SUPABASE_SERVICE_KEY` в `.env`

> ⚠️ Используй именно `service_role` ключ для бэкенда — он обходит RLS.
> Никогда не публикуй этот ключ в открытый код / фронтенд!

---

## Шаг 2 — ЮКасса

### 2.1 Регистрация
1. Зайди на https://yookassa.ru → Подключиться
2. Выбери тип: **Физическое лицо** (или ИП/ООО, если есть)
3. Заполни заявку, дождись проверки (1–3 рабочих дня)

### 2.2 Тестовый режим
Пока аккаунт не активирован, можно тестировать:
1. В личном кабинете выбери **Мои магазины → Тестовый магазин**
2. `shopId` тестового магазина + `Secret Key` — вставь в `.env`
3. Тестовые карты: https://yookassa.ru/developers/payment-acceptance/testing/test-bank-cards

### 2.3 Получи ключи (боевые)
1. Личный кабинет → **Мои магазины → Ваш магазин**
2. Вкладка **Интеграция → API ключи**
3. Скопируй `shopId` и нажми «Создать секретный ключ»
4. Вставь в `.env`:
   ```
   YOOKASSA_SHOP_ID=123456
   YOOKASSA_SECRET_KEY=live_XXXXXXXXXXXXXX
   ```

### 2.4 Настрой вебхук
1. В ЮКасса: **Мои магазины → Интеграция → HTTP-уведомления**
2. URL: `   `
3. Отметь событие: `payment.succeeded`

### 2.5 Настрой возврат после оплаты
В коде уже прописан `return_url: ${SITE_URL}/payment/success`.
Убедись что `SITE_URL` в `.env` = твой реальный домен.

---

## Шаг 3 — Добавь зависимости в backend

```bash
cd backend
npm install @supabase/supabase-js node-fetch uuid
```

В `server.js` добавь подключение роута (после `const app = express()`):

```js
const paymentRoutes = require('./payment')
app.use('/api/payment', paymentRoutes)
```

---

## Шаг 4 — Файл .env

Скопируй `backend/.env.example` в `backend/.env` и заполни:

```env
YOOKASSA_SHOP_ID=123456
YOOKASSA_SECRET_KEY=live_XXXXXXXXXXXXX
SUPABASE_URL=https://XXXXXXXX.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SITE_URL=https://4playaz.ru
```

---

## Шаг 5 — Фронтенд (.env)

В `frontend/.env`:
```env
NUXT_PUBLIC_API_BASE=https://api.4playaz.ru
```
(или `http://localhost:3001` для разработки)

---

## Структура новых файлов

```
4playaz/
├── backend/
│   ├── payment.js          ← Маршруты ЮКасса + Supabase
│   ├── supabase_schema.sql ← SQL для создания таблицы
│   ├── .env.example        ← Шаблон переменных окружения
│   └── server.js           ← (существующий, добавь require payment.js)
├── frontend/
│   └── pages/
│       ├── index.vue           ← Главная (обновлена, кнопка «Купить»)
│       ├── oferta.vue          ← Страница договора оферты
│       └── payment/
│           └── success.vue     ← Страница успешной оплаты
```

---

## Просмотр заказов

В Supabase Dashboard → **Table Editor → customers**:
- Видишь все заказы
- Статусы: `pending` → `created` → `paid`
- Фильтруй по `status = 'paid'` для оплаченных

---

## Чеклист перед запуском

- [ ] Зарегистрирован в ЮКасса, аккаунт подтверждён
- [ ] Создан проект в Supabase, SQL схема выполнена
- [ ] Заполнен `backend/.env` (все 5 переменных)
- [ ] Вебхук ЮКасса настроен на `/api/payment/webhook`
- [ ] `SITE_URL` = реальный домен сайта
- [ ] `npm install @supabase/supabase-js node-fetch uuid` выполнен в backend/
- [ ] В `server.js` добавлен `app.use('/api/payment', require('./payment'))`
- [ ] Протестирован тестовый платёж через тестовые карты ЮКасса
