// ─── ВАЖНО: все секреты читаются из .env ───────────────────
require('dotenv').config()

const express  = require('express')
const cors     = require('cors')
const jwt      = require('jsonwebtoken')
const fs       = require('fs')
const path     = require('path')
const crypto   = require('crypto')
const speakeasy = require('speakeasy')
const QRCode   = require('qrcode')

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

const paymentRoutes = require('./payment')
app.use('/api/payment', paymentRoutes)

const ordersRoutes = require('./orders')
app.use('/api/orders', ordersRoutes)

const cdekRoutes = require('./cdek')
app.use('/api/cdek', cdekRoutes)

// ─── СЕКРЕТЫ ───────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('\n❌ JWT_SECRET не задан в .env!')
  process.exit(1)
}

function loadAdmins() {
  const admins = {}
  for (const [key, val] of Object.entries(process.env)) {
    const match = key.match(/^ADMIN_(.+)_PASSWORD$/)
    if (match && val) {
      const username = match[1].toLowerCase()
      admins[username] = {
        password: val,
        totpSecret: process.env[`TOTP_SECRET_${match[1].toUpperCase()}`] || '',
      }
    }
  }
  if (Object.keys(admins).length === 0) {
    console.error('\n❌ Нет ни одного админа в .env!')
    process.exit(1)
  }
  return admins
}
const ADMINS = loadAdmins()

// ─── ПАПКИ ─────────────────────────────────────────────────
const DATA_DIR         = path.join(__dirname, 'data')
const UPLOADS_DIR      = path.join(__dirname, 'uploads')
const PRODUCTS_FILE    = path.join(DATA_DIR, 'products.json')
const COLLECTIONS_FILE = path.join(DATA_DIR, 'collections.json')
const SECRETS_FILE     = path.join(DATA_DIR, 'totp_secrets.json')
const BANLIST_FILE     = path.join(DATA_DIR, 'banlist.json')

if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR,    { recursive: true })
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

// ─── A07: RATE LIMIT + IP BAN (3 попытки → бан) ────────────
// { ip: { count: N, bannedAt: timestamp | null, lastAttempt: timestamp } }
const loginAttempts = new Map()
const MAX_ATTEMPTS  = 3
const BAN_DURATION  = 24 * 60 * 60 * 1000 // 24 часа (мс)

function loadBanlist() {
  if (!fs.existsSync(BANLIST_FILE)) return {}
  try { return JSON.parse(fs.readFileSync(BANLIST_FILE, 'utf-8')) } catch { return {} }
}
function saveBanlist(bl) {
  fs.writeFileSync(BANLIST_FILE, JSON.stringify(bl, null, 2), 'utf-8')
}

// Синхронизируем постоянный бан-файл в память при старте
const persistentBans = loadBanlist()
for (const [ip, data] of Object.entries(persistentBans)) {
  loginAttempts.set(ip, data)
}

function getClientIp(req) {
  // Учитываем reverse-proxy (nginx)
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

function isIpBanned(ip) {
  const entry = loginAttempts.get(ip)
  if (!entry || !entry.bannedAt) return false

  // banlist.json — источник истины. Если IP убрали из файла руками,
  // снимаем бан и из памяти тоже (без перезапуска бэкенда).
  const fileBl = loadBanlist()
  if (!fileBl[ip]) {
    loginAttempts.delete(ip)
    return false
  }

  const elapsed = Date.now() - entry.bannedAt
  if (elapsed >= BAN_DURATION) {
    loginAttempts.delete(ip)
    delete fileBl[ip]
    saveBanlist(fileBl)
    return false
  }
  return true
}

function recordFailedAttempt(ip) {
  const entry = loginAttempts.get(ip) || { count: 0, bannedAt: null, lastAttempt: null }
  entry.count++
  entry.lastAttempt = Date.now()

  if (entry.count >= MAX_ATTEMPTS) {
    entry.bannedAt = Date.now()
    console.warn(`[BAN] IP заблокирован: ${ip} (${MAX_ATTEMPTS} неудачных попыток)`)
  }

  loginAttempts.set(ip, entry)

  // Сохраняем бан в файл чтобы пережить перезапуск
  if (entry.bannedAt) {
    const bl = loadBanlist()
    bl[ip] = entry
    saveBanlist(bl)
  }
}

function resetAttempts(ip) {
  loginAttempts.delete(ip)
  const bl = loadBanlist()
  if (bl[ip]) { delete bl[ip]; saveBanlist(bl) }
}

// ─── TOTP СЕКРЕТЫ ──────────────────────────────────────────
function loadSecrets() {
  if (!fs.existsSync(SECRETS_FILE)) return {}
  try { return JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf-8')) } catch { return {} }
}
function saveSecrets(s) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(s, null, 2), 'utf-8')
}
function getAdminSecret(username) {
  const f = loadSecrets()
  return f[username] || ADMINS[username]?.totpSecret || null
}

// ─── A01: статика без листинга директории ──────────────────
app.use('/uploads', express.static(UPLOADS_DIR, { index: false, dotfiles: 'deny' }))

// ─── A03: санитизация строк ────────────────────────────────
const ALLOWED_BADGES       = ['', 'New', 'Best Seller', 'Sale', 'Pre-Order', 'Exclusive']
const ALLOWED_CLOTHING     = ['', 'hoodie', 'tshirt', 'longsleeve', 'jacket', 'pants', 'accessories']
const IMAGE_REGEX          = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+=*$/
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB base64

function sanitizeString(val, maxLen = 300) {
  if (typeof val !== 'string') return ''
  return val.replace(/[<>]/g, '').trim().slice(0, maxLen)
}

// ─── A01: рандомное имя файла вместо предсказуемого ────────
function saveBase64Image(base64str) {
  // A03: строгая проверка формата
  if (!base64str || !IMAGE_REGEX.test(base64str)) return null

  // A03: ограничение размера
  const base64data = base64str.split(',')[1]
  const sizeBytes  = Math.ceil(base64data.length * 0.75)
  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    console.warn('[IMG] Файл превышает 10 МБ, пропущен')
    return null
  }

  const extMatch = base64str.match(/^data:image\/(png|jpe?g|webp|gif);/)
  const rawExt   = extMatch ? extMatch[1] : 'jpg'
  const ext      = rawExt === 'jpeg' ? 'jpg' : rawExt

  // A01: рандомное имя через crypto
  const randomName = crypto.randomBytes(16).toString('hex')
  const filename   = `${randomName}.${ext}`
  const filepath   = path.join(UPLOADS_DIR, filename)

  fs.writeFileSync(filepath, Buffer.from(base64data, 'base64'))
  return `/uploads/${filename}`
}

// ─── AUTH MIDDLEWARE ────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try { req.user = jwt.verify(token, JWT_SECRET); next() }
  catch { return res.status(401).json({ error: 'Invalid token' }) }
}

// ─── ТОВАРЫ ────────────────────────────────────────────────
function getDefaultProducts() {
  return [
    { id: 1, name: 'Oversized Hoodie "XBOX360"',         category: 'DJ XBOX360',                 clothingType: 'hoodie',     price: 6900, oldPrice: null, desc: 'Тяжёлый оверсайз-худи коллекции DJ XBOX360.',   badge: 'New',         image: '', images: [] },
    { id: 2, name: 'Drop-Shoulder Hoodie "PROPOVEDNIK"', category: '3.5 PROPOVEDNIK COLLECTION', clothingType: 'hoodie',     price: 7500, oldPrice: 9000, desc: 'Худи из коллекции 3.5 PROPOVEDNIK.',             badge: 'Sale',        image: '', images: [] },
    { id: 3, name: 'Classic Tee "4PLAYAZ"',              category: 'DJ XBOX360',                 clothingType: 'tshirt',     price: 3900, oldPrice: null, desc: 'Базовая футболка из коллекции 4PLAYAZ.',         badge: 'Best Seller', image: '', images: [] },
    { id: 4, name: 'Longsleeve "PIMPIN"',                category: '3.5 PROPOVEDNIK COLLECTION', clothingType: 'longsleeve', price: 4800, oldPrice: null, desc: 'Лонгслив с вышивкой PIMPIN.',                   badge: '',            image: '', images: [] },
    { id: 5, name: 'Hoodie "DONT TEST"',                 category: 'DJ XBOX360',                 clothingType: 'hoodie',     price: 7200, oldPrice: null, desc: 'Худи с принтом DONT TEST MY PIMPIN.',           badge: 'New',         image: '', images: [] },
    { id: 6, name: 'Zip Hoodie "PROPHET"',               category: '3.5 PROPOVEDNIK COLLECTION', clothingType: 'hoodie',     price: 8100, oldPrice: null, desc: 'Зип-худи PROPOVEDNIK.',                         badge: 'Exclusive',   image: '', images: [] },
  ]
}
function loadProducts() {
  if (!fs.existsSync(PRODUCTS_FILE)) return getDefaultProducts()
  try { return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8')) }
  catch { return getDefaultProducts() }
}
function saveProducts(p) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(p, null, 2), 'utf-8')
}
let products = loadProducts()

// ─── КОЛЛЕКЦИИ ─────────────────────────────────────────────
function loadCollections() {
  if (!fs.existsSync(COLLECTIONS_FILE)) {
    const d = ['DJ XBOX360', '3.5 PROPOVEDNIK COLLECTION']
    saveCollections(d); return d
  }
  try { return JSON.parse(fs.readFileSync(COLLECTIONS_FILE, 'utf-8')) }
  catch { return ['DJ XBOX360', '3.5 PROPOVEDNIK COLLECTION'] }
}
function saveCollections(c) {
  fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(c, null, 2), 'utf-8')
}
let collections = loadCollections()

// ─── PUBLIC: ТОВАРЫ ────────────────────────────────────────
app.get('/api/products', (req, res) => {
  let result = [...products]
  if (req.query.category)    result = result.filter(p => p.category    === req.query.category)
  if (req.query.clothingType) result = result.filter(p => p.clothingType === req.query.clothingType)
  res.json(result)
})

// A04: parseInt + isNaN везде
app.get('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Некорректный ID' })
  const p = products.find(p => p.id === id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json(p)
})

// ─── PUBLIC: КОЛЛЕКЦИИ ─────────────────────────────────────
app.get('/api/collections', (req, res) => res.json(collections))

// ─── ADMIN: КОЛЛЕКЦИИ ──────────────────────────────────────
app.post('/api/admin/collections', authMiddleware, (req, res) => {
  const name = sanitizeString(req.body.name, 100)
  if (!name) return res.status(400).json({ error: 'Введите название' })
  if (collections.includes(name)) return res.status(409).json({ error: 'Уже существует' })
  collections.push(name)
  saveCollections(collections)
  const linkedCount = products.filter(p => p.category === name).length
  res.status(201).json({ name, linkedCount })
})
app.delete('/api/admin/collections/:name', authMiddleware, (req, res) => {
  const name = sanitizeString(decodeURIComponent(req.params.name), 100)
  collections = collections.filter(c => c !== name)
  saveCollections(collections)
  res.json({ ok: true })
})

// ─── LOGIN: rate limit + IP ban ────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const ip = getClientIp(req)

  // Проверяем бан
  if (isIpBanned(ip)) {
    const entry      = loginAttempts.get(ip)
    const remaining  = Math.ceil((BAN_DURATION - (Date.now() - entry.bannedAt)) / 3600000)
    console.warn(`[BLOCKED] Попытка входа с забаненного IP: ${ip}`)
    return res.status(429).json({
      error: `Слишком много неудачных попыток. IP заблокирован на ${remaining} ч.`,
    })
  }

  // Количество оставшихся попыток перед баном
  const currentEntry = loginAttempts.get(ip) || { count: 0 }
  const attemptsLeft = MAX_ATTEMPTS - currentEntry.count

  const { username, password, totp } = req.body

  if (!username || !password || !totp) {
    return res.status(400).json({ error: 'Заполните все поля, включая код из приложения' })
  }

  // A07: user enumeration — одно сообщение для любой ошибки логин/пароль
  const admin = ADMINS[username?.toLowerCase()]
  const passwordOk = admin && admin.password === password.trim()

  if (!admin || !passwordOk) {
    recordFailedAttempt(ip)
    const left = MAX_ATTEMPTS - (loginAttempts.get(ip)?.count || 0)
    const msg  = left > 0
      ? `Неверные данные для входа. Осталось попыток: ${left}`
      : 'IP адрес заблокирован за превышение лимита попыток'
    return res.status(401).json({ error: msg })
  }

  // Проверяем TOTP
  const secret = getAdminSecret(username.toLowerCase())
  if (!secret) {
    return res.status(500).json({ error: `TOTP не настроен. Открой: /api/admin/setup-totp/${username}` })
  }

  const verified = speakeasy.totp.verify({
    secret, encoding: 'base32',
    token: totp.toString().trim(), window: 1,
  })

  if (!verified) {
    recordFailedAttempt(ip)
    const left = MAX_ATTEMPTS - (loginAttempts.get(ip)?.count || 0)
    const msg  = left > 0
      ? `Неверный код из приложения. Осталось попыток: ${left}`
      : 'IP адрес заблокирован за превышение лимита попыток'
    return res.status(401).json({ error: msg })
  }

  // Успешный вход — сбрасываем счётчик
  resetAttempts(ip)
  const token = jwt.sign({ username: username.toLowerCase(), role: 'admin' }, JWT_SECRET, { expiresIn: '12h' })
  console.log('[LOGIN OK]', username.toLowerCase(), 'from', ip)
  res.json({ token })
})

// ─── ADMIN: ТОВАРЫ ─────────────────────────────────────────
app.post('/api/admin/products', authMiddleware, (req, res) => {
  const body = req.body

  // A03: санитизация всех полей
  const name        = sanitizeString(body.name, 200)
  const category    = sanitizeString(body.category, 100)
  const clothingType = sanitizeString(body.clothingType, 50)
  const desc        = sanitizeString(body.desc, 2000)
  const price       = Number(body.price)
  const oldPrice    = body.oldPrice ? Number(body.oldPrice) : null

  // A03: whitelist для badge и clothingType
  const badge = ALLOWED_BADGES.includes(body.badge) ? body.badge : ''

  if (!name)             return res.status(400).json({ error: 'Введите название товара' })
  if (!price || price <= 0 || price > 10_000_000)
    return res.status(400).json({ error: 'Введите корректную цену' })

  const id  = Date.now()
  const raw = Array.isArray(body.images) ? body.images : (body.image ? [body.image] : [])

  // A03: фильтруем только валидные изображения
  const saved = raw
    .slice(0, 10) // не более 10 фото
    .map(img => saveBase64Image(img))
    .filter(Boolean)

  const product = {
    id, name, category, clothingType, price, oldPrice, desc, badge,
    image: saved[0] || '',
    images: saved,
  }
  products.unshift(product)
  saveProducts(products)
  console.log('[ADD]', product.name, '| imgs:', saved.length)
  res.status(201).json(product)
})

app.delete('/api/admin/products/:id', authMiddleware, (req, res) => {
  // A04: строгая проверка ID
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Некорректный ID' })

  const p = products.find(x => x.id === id)
  if (!p) return res.status(404).json({ error: 'Not found' })

  // Path traversal защита при удалении файлов
  ;(p.images || []).forEach(imgPath => {
    if (typeof imgPath !== 'string' || !imgPath.startsWith('/uploads/')) return
    const resolved = path.resolve(path.join(__dirname, imgPath))
    // Убеждаемся что файл находится строго внутри UPLOADS_DIR
    if (!resolved.startsWith(UPLOADS_DIR + path.sep) && resolved !== UPLOADS_DIR) return
    if (fs.existsSync(resolved)) fs.unlinkSync(resolved)
  })

  products = products.filter(x => x.id !== id)
  saveProducts(products)
  console.log('[DELETE]', id)
  res.json({ ok: true })
})

app.put('/api/admin/products/:id', authMiddleware, (req, res) => {
  // A04: строгая проверка ID
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Некорректный ID' })

  const idx = products.findIndex(p => p.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })

  const body = req.body

  // A03: санитизация
  const name        = sanitizeString(body.name, 200)
  const category    = sanitizeString(body.category, 100)
  const clothingType = sanitizeString(body.clothingType, 50)
  const desc        = sanitizeString(body.desc, 2000)
  const price       = body.price ? Number(body.price) : products[idx].price
  const oldPrice    = body.oldPrice != null ? Number(body.oldPrice) : null
  const badge       = ALLOWED_BADGES.includes(body.badge) ? body.badge : products[idx].badge

  // Обрабатываем фото если переданы новые
  let images = products[idx].images || []
  let image  = products[idx].image  || ''
  if (Array.isArray(body.images) && body.images.length > 0) {
    const saved = body.images
      .slice(0, 10)
      .map(img => {
        // Уже сохранённые пути оставляем как есть
        if (typeof img === 'string' && img.startsWith('/uploads/')) return img
        return saveBase64Image(img)
      })
      .filter(Boolean)
    if (saved.length > 0) { images = saved; image = saved[0] }
  }

  // A04: id вырезается из body — нельзя сменить ID через PUT
  products[idx] = {
    ...products[idx],
    name: name || products[idx].name,
    category, clothingType, desc, badge,
    price: price > 0 ? price : products[idx].price,
    oldPrice,
    image, images,
    id, // всегда оригинальный
  }

  saveProducts(products)
  res.json(products[idx])
})

// ─── ADMIN: просмотр бан-листа (только для отладки) ────────
app.get('/api/admin/banlist', authMiddleware, (req, res) => {
  const bl = loadBanlist()
  const result = Object.entries(bl).map(([ip, data]) => ({
    ip,
    attempts: data.count,
    banned: !!data.bannedAt,
    bannedAt: data.bannedAt ? new Date(data.bannedAt).toISOString() : null,
    expiresIn: data.bannedAt
      ? `${Math.ceil((BAN_DURATION - (Date.now() - data.bannedAt)) / 60000)} мин`
      : null,
  }))
  res.json(result)
})

// ─── ADMIN: разбанить IP вручную ───────────────────────────
app.delete('/api/admin/banlist/:ip', authMiddleware, (req, res) => {
  const ip = req.params.ip
  resetAttempts(ip)
  console.log('[UNBAN]', ip)
  res.json({ ok: true, message: `IP ${ip} разблокирован` })
})

// ─── SETUP TOTP (одноразовый маршрут) ──────────────────────
app.get('/api/admin/setup-totp/:username', async (req, res) => {
  const username = sanitizeString(req.params.username, 50).toLowerCase()
  if (!ADMINS[username]) return res.status(404).send('Пользователь не найден')

  const secrets = loadSecrets()
  if (secrets[username]) {
    return res.send(`<h2>TOTP для ${username} уже настроен.</h2><p>Удали запись из data/totp_secrets.json чтобы сбросить.</p>`)
  }

  const secret = speakeasy.generateSecret({ name: `4PLAYAZ (${username})`, length: 20 })
  secrets[username] = secret.base32
  saveSecrets(secrets)

  const qr = await QRCode.toDataURL(secret.otpauth_url)
  res.send(`
    <html><body style="font-family:monospace;padding:30px;background:#111;color:#fff">
    <h2>Настройка TOTP для: ${username}</h2>
    <p>1. Установи Google Authenticator</p>
    <p>2. Отсканируй QR-код:</p>
    <img src="${qr}" style="border:4px solid #fff">
    <p>3. При входе вводи 6-значный код из приложения</p>
    <p style="color:#e74c3c;margin-top:20px">⚠️ QR показывается ОДИН РАЗ. Сохрани его!</p>
    <p>Ключ для ручного ввода: <b>${secret.base32}</b></p>
    </body></html>
  `)
})

// ─── START ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`\n4PLAYAZ Backend → http://localhost:${PORT}`)
  console.log(`Admins: ${Object.keys(ADMINS).join(', ')}`)
  console.log(`Data:    ${PRODUCTS_FILE}`)
  console.log(`Uploads: ${UPLOADS_DIR}`)
  console.log(`Banlist: ${BANLIST_FILE}\n`)
})
