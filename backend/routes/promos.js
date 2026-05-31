// ══════════════════════════════════════════════════════════
//  4PLAYAZ — backend/routes/promos.js
//  Массовые акции (скидки) + промо-баннер.
//  Публичный GET баннера + админский CRUD акций и баннера.
// ══════════════════════════════════════════════════════════

const express = require('express')
const router  = express.Router()

const store  = require('../lib/store')
const promos = require('../lib/promos')
const { authMiddleware } = require('../lib/auth')

// ─── ВАЛИДАЦИЯ ПЭЙЛОАДА АКЦИИ ──────────────────────────────
const ALLOWED_FILTER_TYPES = ['all', 'category', 'collection', 'clothingType']

function parseDiscountBody(body) {
  const name = String(body.name || '').trim()
  const percent = Number(body.percent)
  const rawFilter = body.filter || {}
  const filterType = ALLOWED_FILTER_TYPES.includes(rawFilter.type) ? rawFilter.type : 'all'
  const filterValue = filterType === 'all' ? '' : String(rawFilter.value || '').trim()

  if (!name) return { error: 'Введите название' }
  if (!percent || percent < 1 || percent > 90) return { error: 'Процент: 1..90' }
  if ((filterType === 'category' || filterType === 'collection' || filterType === 'clothingType') && !filterValue) {
    return { error: 'Выберите фильтр' }
  }

  const toIso = (v) => {
    if (!v) return null
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }

  return {
    value: {
      name,
      percent: Math.round(percent),
      filter: { type: filterType, value: filterValue },
      startDate: toIso(body.startDate),
      endDate:   toIso(body.endDate),
      enabled:   body.enabled !== false,
    },
  }
}

// Акция + вычисленный флаг active (для отображения в админке)
function withActive(d) {
  return { ...d, active: promos.isActive(d) }
}

// ═══ БАННЕР ════════════════════════════════════════════════

// PUBLIC: текущий баннер + active
router.get('/api/banner', (req, res) => {
  const b = promos.getBanner()
  res.json({ ...b, active: promos.isActive(b) && !!b.text })
})

// ADMIN: сохранить баннер
router.put('/api/admin/banner', authMiddleware, (req, res) => {
  const body = req.body || {}
  const toIso = (v) => {
    if (!v) return null
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  const next = {
    enabled:   !!body.enabled,
    text:      String(body.text || '').slice(0, 200),
    startDate: toIso(body.startDate),
    endDate:   toIso(body.endDate),
    bgColor:   /^#[0-9a-fA-F]{6}$/.test(body.bgColor)   ? body.bgColor   : '#7d0a0a',
    textColor: /^#[0-9a-fA-F]{6}$/.test(body.textColor) ? body.textColor : '#ffffff',
  }
  if (next.enabled && !next.text) return res.status(400).json({ error: 'Введите текст баннера' })

  promos.setBanner(next)
  promos.saveBanner()
  const b = promos.getBanner()
  res.json({ ...b, active: promos.isActive(b) && !!b.text })
})

// ═══ АКЦИИ ═════════════════════════════════════════════════

// ADMIN: список акций
router.get('/api/admin/discounts', authMiddleware, (req, res) => {
  res.json(promos.getDiscounts().map(withActive))
})

// ADMIN: превью — какие товары попадут под акцию
router.post('/api/admin/discounts/preview', authMiddleware, (req, res) => {
  const rawFilter = (req.body && req.body.filter) || {}
  const filter = {
    type: ALLOWED_FILTER_TYPES.includes(rawFilter.type) ? rawFilter.type : 'all',
    value: String(rawFilter.value || '').trim(),
  }
  res.json(promos.previewDiscount(store.getProducts(), filter))
})

// ADMIN: создать акцию
router.post('/api/admin/discounts', authMiddleware, (req, res) => {
  const parsed = parseDiscountBody(req.body || {})
  if (parsed.error) return res.status(400).json({ error: parsed.error })

  const discount = { id: Date.now(), ...parsed.value }
  const list = promos.getDiscounts()
  list.unshift(discount)
  promos.saveDiscounts()
  res.json(withActive(discount))
})

// ADMIN: изменить акцию
router.put('/api/admin/discounts/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Некорректный ID' })

  const list = promos.getDiscounts()
  const d = list.find((x) => x.id === id)
  if (!d) return res.status(404).json({ error: 'Not found' })

  const parsed = parseDiscountBody(req.body || {})
  if (parsed.error) return res.status(400).json({ error: parsed.error })

  Object.assign(d, parsed.value)
  promos.saveDiscounts()
  res.json(withActive(d))
})

// ADMIN: вкл/выкл акцию
router.post('/api/admin/discounts/:id/toggle', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Некорректный ID' })

  const d = promos.getDiscounts().find((x) => x.id === id)
  if (!d) return res.status(404).json({ error: 'Not found' })

  d.enabled = d.enabled === false
  promos.saveDiscounts()
  res.json(withActive(d))
})

// ADMIN: удалить акцию
router.delete('/api/admin/discounts/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Некорректный ID' })

  promos.setDiscounts(promos.getDiscounts().filter((x) => x.id !== id))
  promos.saveDiscounts()
  res.json({ ok: true })
})

module.exports = router
