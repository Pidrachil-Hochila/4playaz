// ══════════════════════════════════════════════════════════
//  4PLAYAZ — backend/lib/promos.js
//  Массовые акции (скидки) + промо-баннер.
//  - Акции НЕ переписывают цены в products.json. price/oldPrice
//    считаются «на лету» при отдаче каталога (см. applyDiscounts).
//  - Если у товара уже задана ручная oldPrice — акция к нему НЕ
//    применяется (ручная скидка приоритетнее).
// ══════════════════════════════════════════════════════════

const fs   = require('fs')
const path = require('path')

const DATA_DIR       = path.join(__dirname, '..', 'data')
const DISCOUNTS_FILE = path.join(DATA_DIR, 'discounts.json')
const BANNER_FILE    = path.join(DATA_DIR, 'banner.json')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

// ─── ХРАНИЛИЩЕ ─────────────────────────────────────────────
const DEFAULT_BANNER = {
  enabled: false,
  text: '',
  startDate: null,
  endDate: null,
  bgColor: '#7d0a0a',
  textColor: '#ffffff',
}

function loadDiscounts() {
  if (!fs.existsSync(DISCOUNTS_FILE)) return []
  try {
    const data = JSON.parse(fs.readFileSync(DISCOUNTS_FILE, 'utf-8'))
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

function loadBanner() {
  if (!fs.existsSync(BANNER_FILE)) return { ...DEFAULT_BANNER }
  try { return { ...DEFAULT_BANNER, ...JSON.parse(fs.readFileSync(BANNER_FILE, 'utf-8')) } }
  catch { return { ...DEFAULT_BANNER } }
}

let discounts = loadDiscounts()
let banner    = loadBanner()

function saveDiscounts() {
  fs.writeFileSync(DISCOUNTS_FILE, JSON.stringify(discounts, null, 2), 'utf-8')
}
function saveBanner() {
  fs.writeFileSync(BANNER_FILE, JSON.stringify(banner, null, 2), 'utf-8')
}

// ─── АКТИВНОСТЬ ПО ДАТАМ ───────────────────────────────────
// active = включено И (нет начала | уже наступило) И (нет конца | ещё не прошёл)
function isActive(item, now = Date.now()) {
  if (item.enabled === false) return false
  if (item.startDate && now < new Date(item.startDate).getTime()) return false
  if (item.endDate   && now > new Date(item.endDate).getTime())   return false
  return true
}

// ─── МАТЧИНГ ТОВАРА ПОД ФИЛЬТР АКЦИИ ───────────────────────
function matchProduct(product, filter) {
  if (!filter || filter.type === 'all') return true
  if (filter.type === 'category' || filter.type === 'collection') return product.category === filter.value
  if (filter.type === 'clothingType') return product.clothingType === filter.value
  return false
}

// Максимальный процент активной акции для товара (0 — нет акции)
function bestPercentFor(product, now = Date.now()) {
  let best = 0
  for (const d of discounts) {
    if (!isActive(d, now)) continue
    if (!matchProduct(product, d.filter)) continue
    const pct = Number(d.percent) || 0
    if (pct > best) best = pct
  }
  return Math.min(best, 90)
}

// ─── ПРИМЕНЕНИЕ СКИДОК «НА ЛЕТУ» ───────────────────────────
// Возвращает НОВЫЙ массив с пересчитанными ценами; исходные
// объекты в памяти не мутируются.
function applyDiscounts(products, now = Date.now()) {
  return products.map((p) => {
    // ручная скидка (oldPrice задан в карточке) — оставляем как есть
    if (p.oldPrice != null) return p
    const pct = bestPercentFor(p, now)
    if (pct <= 0) return p
    const base = Number(p.price) || 0
    return {
      ...p,
      price: Math.round(base * (1 - pct / 100)),
      oldPrice: base,
      discountPercent: pct,
    }
  })
}

// ─── PREVIEW: какие товары попадут под акцию ───────────────
function previewDiscount(products, filter, limit = 8) {
  const matched = products.filter((p) => !p.hidden && matchProduct(p, filter))
  return {
    count: matched.length,
    sample: matched.slice(0, limit).map((p) => ({
      id: p.id,
      name: p.name,
      basePrice: p.oldPrice != null ? p.oldPrice : p.price,
    })),
  }
}

module.exports = {
  // акции
  getDiscounts: () => discounts,
  setDiscounts: (next) => { discounts = next },
  saveDiscounts,
  // баннер
  getBanner: () => banner,
  setBanner: (next) => { banner = { ...DEFAULT_BANNER, ...next } },
  saveBanner,
  // логика
  isActive,
  matchProduct,
  applyDiscounts,
  previewDiscount,
}
