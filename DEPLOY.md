# 🚀 Инструкция по деплою 4PLAYAZ на хостинг

---

## 📦 Что НЕ нужно загружать (экономит ГБ)

```
node_modules/     ← НЕ загружать (переустанавливается на сервере)
.nuxt/            ← НЕ загружать (генерируется при сборке)
.output/          ← НЕ загружать (генерируется при сборке)
```

---

## 🖥 Требования к хостингу

Нужен **VPS/хостинг с Node.js**. Подходят:
- **Beget** (beget.com) — есть Node.js, дёшево
- **TimeWeb Cloud** — VPS от 200₽/мес
- **Selectel** — VPS
- **Railway.app** — бесплатный тариф, деплой через GitHub
- **Render.com** — бесплатный тариф

> ❌ Обычный виртуальный хостинг (только PHP) — **не подойдёт**

---

## 📁 Как подготовить и загрузить

### Шаг 1 — Собери фронтенд

```bash
cd frontend
npm install
npm run build
```

После сборки появится папка `.output/` — это и есть готовый сайт.

### Шаг 2 — Упакуй для загрузки

Загружать нужно только:
```
backend/
  server.js
  package.json
  data/          ← папка с товарами (если есть)
  uploads/       ← папка с фото (если есть)

frontend/.output/   ← собранный фронтенд
```

Или через zip (без node_modules):
```bash
# Windows (PowerShell):
Compress-Archive -Path backend, frontend\.output -DestinationPath 4playaz-deploy.zip -Force

# Mac/Linux:
zip -r 4playaz-deploy.zip backend/ frontend/.output/ --exclude "*/node_modules/*"
```

### Шаг 3 — Загрузи на сервер

**Через FTP/SFTP** (FileZilla, WinSCP):
1. Подключись к серверу
2. Загрузи папки `backend/` и `frontend/.output/`

**Через SSH:**
```bash
scp -r backend/ user@твой-сервер:/var/www/4playaz/
scp -r frontend/.output/ user@твой-сервер:/var/www/4playaz/frontend/
```

### Шаг 4 — Установи зависимости на сервере

```bash
# Подключись по SSH
ssh user@твой-сервер

# Перейди в папку бэкенда
cd /var/www/4playaz/backend
npm install

# Перейди в папку фронтенда
cd /var/www/4playaz/frontend
npm install
```

### Шаг 5 — Настрой переменные окружения

На сервере создай файл `/var/www/4playaz/frontend/.env`:
```
API_BASE=http://localhost:4000
```

Или если у тебя домен:
```
API_BASE=https://api.твой-домен.ru
```

### Шаг 6 — Запусти через PM2 (чтобы не падало)

```bash
# Установи PM2 глобально
npm install -g pm2

# Запусти бэкенд
cd /var/www/4playaz/backend
pm2 start server.js --name "4playaz-api"

# Запусти фронтенд
cd /var/www/4playaz/frontend
pm2 start node_modules/.bin/nuxt --name "4playaz-front" -- start

# Сохрани конфиг PM2 (автозапуск после перезагрузки)
pm2 save
pm2 startup
```

### Шаг 7 — Nginx (опционально, для домена)

Если есть Nginx, добавь конфиг:

```nginx
# /etc/nginx/sites-available/4playaz
server {
    listen 80;
    server_name твой-домен.ru;

    # Фронтенд
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API бэкенда
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
    }

    # Загруженные фото
    location /uploads/ {
        proxy_pass http://localhost:4000/uploads/;
    }
}
```

```bash
# Активируй конфиг
ln -s /etc/nginx/sites-available/4playaz /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 📸 Оптимизация фото (снижение веса)

Варианты от лучшего к простому:

### Вариант A — Сжатие через Sharp на сервере (рекомендую)
```bash
cd backend
npm install sharp
```
Добавить в `server.js` автоматическое сжатие при загрузке:
- Конвертация в WebP
- Максимум 1200px по длинной стороне
- Качество 80%
- Результат: фото 2МБ → ~150кб

### Вариант B — Сжать заранее через squoosh.app
1. Открой **squoosh.app** в браузере
2. Загрузи фото
3. Выбери формат WebP, качество 80%
4. Скачай и загружай уже сжатые фото

### Вариант C — Cloudinary CDN (внешний сервис)
- Бесплатно до 25ГБ
- Авто-сжатие и WebP на лету
- Регистрация на cloudinary.com

---

## ⚡ Почему проект весит 2ГБ и как решить

| Что весит | Сколько | Решение |
|---|---|---|
| `node_modules/` frontend | ~800МБ | Не хранить, устанавливать через `npm install` |
| `node_modules/` backend | ~50МБ | Не хранить |
| `.nuxt/` кеш | ~100МБ | Не хранить |
| Фото товаров (base64 в памяти) | Зависит | Теперь хранятся как файлы в `uploads/` |
| **Итого без node_modules** | **~5МБ** | ✅ |

**Правило:** в Git и в архив для деплоя — только исходный код без `node_modules`. На сервере запускаешь `npm install` и всё устанавливается заново (~2 минуты).
