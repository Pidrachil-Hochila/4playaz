// ══════════════════════════════════════════════════════════
//  4PLAYAZ — backend/routes/catalog.js
//  Публичный каталог + админский CRUD товаров и коллекций.
// ══════════════════════════════════════════════════════════

const express = require('express')
const fs      = require('fs')
const path    = require('path')
const router  = express.Router()

const store  = require('../lib/store')
const promos = require('../lib/promos')
const { authMiddleware } = require('../lib/auth')
const { ALLOWED_BADGES, sanitizeString } = require('../lib/sanitize')

// ─── PUBLIC: ТОВАРЫ ────────────────────────────────────────
// Цены под активные акции считаются «на лету» (promos.applyDiscounts),
// базовые цены в products.json не меняются.
router.get('/api/products', (req, res) => {
  let result = store.getProducts().filter(p => !p.hidden)
  if (req.query.category)     result = result.filter(p => p.category     === req.query.category)
  if (req.query.clothingType) result = result.filter(p => p.clothingType === req.query.clothingType)
  res.json(promos.applyDiscounts(result))
})

// A04: parseInt + isNaN везде
router.get('/api/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Некорректный ID' })
  const p = store.getProducts().find(p => p.id === id)
  if (!p || p.hidden) return res.status(404).json({ error: 'Not found' })
  res.json(promos.applyDiscounts([p])[0])
})

// ─── ADMIN: ВСЕ ТОВАРЫ (включая скрытые) ───────────────────
router.get('/api/admin/products', authMiddleware, (req, res) => {
  res.json(store.getProducts())
})

// ─── PUBLIC: КОЛЛЕКЦИИ ─────────────────────────────────────
router.get('/api/collections', (req, res) => res.json(store.getCollections()))

// ─── ADMIN: КОЛЛЕКЦИИ ──────────────────────────────────────
router.post('/api/admin/collections', authMiddleware, (req, res) => {
  const name = sanitizeString(req.body.name, 100)
  if (!name) return res.status(400).json({ error: 'Введите название' })
  const collections = store.getCollections()
  if (collections.includes(name)) return res.status(409).json({ error: 'Уже существует' })
  collections.push(name)
  store.saveCollections()
  const linkedCount = store.getProducts().filter(p => p.category === name).length
  res.status(201).json({ name, linkedCount })
})

router.delete('/api/admin/collections/:name', authMiddleware, (req, res) => {
  const name = sanitizeString(decodeURIComponent(req.params.name), 100)
  store.setCollections(store.getCollections().filter(c => c !== name))
  store.saveCollections()
  res.json({ ok: true })
})

// ─── ADMIN: ТОВАРЫ ─────────────────────────────────────────
router.post('/api/admin/products', authMiddleware, (req, res) => {
  const body = req.body

  // A03: санитизация всех полей
  const name         = sanitizeString(body.name, 200)
  const category     = sanitizeString(body.category, 100)
  const clothingType = sanitizeString(body.clothingType, 50)
  const desc         = sanitizeString(body.desc, 2000)
  const price        = Number(body.price)
  const oldPrice     = body.oldPrice ? Number(body.oldPrice) : null

  // A03: whitelist для badge
  const badge = ALLOWED_BADGES.includes(body.badge) ? body.badge : ''

  if (!name) return res.status(400).json({ error: 'Введите название товара' })
  if (!price || price <= 0 || price > 10_000_000)
    return res.status(400).json({ error: 'Введите корректную цену' })

  const id  = Date.now()
  const raw = Array.isArray(body.images) ? body.images : (body.image ? [body.image] : [])

  // A03: фильтруем только валидные изображения, не более 10 фото
  const saved = raw.slice(0, 10).map(img => store.saveBase64Image(img)).filter(Boolean)

  const product = {
    id, name, category, clothingType, price, oldPrice, desc, badge,
    image: saved[0] || '',
    images: saved,
    hidden: false,
  }
  store.getProducts().unshift(product)
  store.saveProducts()
  console.log('[ADD]', product.name, '| imgs:', saved.length)
  res.status(201).json(product)
})

router.delete('/api/admin/products/:id', authMiddleware, (req, res) => {
  // A04: строгая проверка ID
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Некорректный ID' })

  const products = store.getProducts()
  const p = products.find(x => x.id === id)
  if (!p) return res.status(404).json({ error: 'Not found' })

  // Path traversal защита при удалении файлов
  ;(p.images || []).forEach(imgPath => {
    if (typeof imgPath !== 'string' || !imgPath.startsWith('/uploads/')) return
    const resolved = path.resolve(path.join(__dirname, '..', imgPath))
    // Убеждаемся что файл находится строго внутри UPLOADS_DIR
    if (!resolved.startsWith(store.UPLOADS_DIR + path.sep) && resolved !== store.UPLOADS_DIR) return
    if (fs.existsSync(resolved)) fs.unlinkSync(resolved)
  })

  store.setProducts(products.filter(x => x.id !== id))
  store.saveProducts()
  console.log('[DELETE]', id)
  res.json({ ok: true })
})

router.put('/api/admin/products/:id', authMiddleware, (req, res) => {
  // A04: строгая проверка ID
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Некорректный ID' })

  const products = store.getProducts()
  const idx = products.findIndex(p => p.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })

  const body = req.body

  // A03: санитизация
  const name         = sanitizeString(body.name, 200)
  const category     = sanitizeString(body.category, 100)
  const clothingType = sanitizeString(body.clothingType, 50)
  const desc         = sanitizeString(body.desc, 2000)
  const price        = body.price ? Number(body.price) : products[idx].price
  const oldPrice     = body.oldPrice != null ? Number(body.oldPrice) : null
  const badge        = ALLOWED_BADGES.includes(body.badge) ? body.badge : products[idx].badge

  // Обрабатываем фото если переданы новые
  let images = products[idx].images || []
  let image  = products[idx].image  || ''
  if (Array.isArray(body.images) && body.images.length > 0) {
    const saved = body.images
      .slice(0, 10)
      .map(img => {
        // Уже сохранённые пути оставляем как есть
        if (typeof img === 'string' && img.startsWith('/uploads/')) return img
        return store.saveBase64Image(img)
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

  store.saveProducts()
  res.json(products[idx])
})

// PATCH видимости — отдельный эндпоинт, чтобы не таскать всю модель ради toggle
router.patch('/api/admin/products/:id/visibility', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Некорректный ID' })

  const products = store.getProducts()
  const p = products.find(x => x.id === id)
  if (!p) return res.status(404).json({ error: 'Not found' })

  p.hidden = typeof req.body.hidden === 'boolean' ? req.body.hidden : !p.hidden
  store.saveProducts()
  console.log('[VISIBILITY]', id, '→', p.hidden ? 'hidden' : 'visible')
  res.json({ id: p.id, hidden: p.hidden })
})

module.exports = router
