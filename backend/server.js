// ══════════════════════════════════════════════════════════
//  4PLAYAZ — backend/server.js
//  Точка входа: middleware + монтирование роутеров.
//  Логика вынесена в lib/ (store, security, auth, sanitize)
//  и routes/ (catalog, admin-auth, orders).
// ══════════════════════════════════════════════════════════

require('dotenv').config()

const express = require('express')
const cors    = require('cors')

const app = express()

// ─── A05: убираем X-Powered-By, добавляем security headers ─
app.disable('x-powered-by')
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'no-referrer')
  next()
})

app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// ─── ПРОВЕРКА СЕКРЕТОВ ─────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('\n❌ JWT_SECRET не задан в .env!')
  process.exit(1)
}

const { getAdmins } = require('./lib/auth')
if (Object.keys(getAdmins()).length === 0) {
  console.error('\n❌ Нет ни одного админа в .env!')
  process.exit(1)
}

// ─── A01: статика без листинга директории ──────────────────
const { UPLOADS_DIR } = require('./lib/store')
app.use('/uploads', express.static(UPLOADS_DIR, { index: false, dotfiles: 'deny' }))

// ─── РОУТЕРЫ ───────────────────────────────────────────────
app.use('/api/orders', require('./orders'))      // заказы (Supabase)
app.use('/api/broadcast', require('./broadcast')) // массовая рассылка писем
app.use(require('./routes/catalog'))             // каталог + админский CRUD товаров
app.use(require('./routes/promos'))              // акции (скидки) + промо-баннер
app.use(require('./routes/admin-auth'))          // логин, TOTP, бан-лист

// ─── START ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`\n4PLAYAZ Backend → http://localhost:${PORT}`)
  console.log(`Admins:  ${Object.keys(getAdmins()).join(', ')}`)
  console.log(`Uploads: ${UPLOADS_DIR}\n`)
})
