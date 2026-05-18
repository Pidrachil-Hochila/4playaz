// ══════════════════════════════════════════════════════════
//  4PLAYAZ — backend/lib/store.js
//  In-memory хранилище продуктов и коллекций + сохранение картинок.
//  Данные читаются в память при старте, изменения пишутся в JSON.
// ══════════════════════════════════════════════════════════

const fs     = require('fs')
const path   = require('path')
const crypto = require('crypto')

// ─── ПАПКИ ─────────────────────────────────────────────────
const DATA_DIR         = path.join(__dirname, '..', 'data')
const UPLOADS_DIR      = path.join(__dirname, '..', 'uploads')
const PRODUCTS_FILE    = path.join(DATA_DIR, 'products.json')
const COLLECTIONS_FILE = path.join(DATA_DIR, 'collections.json')

if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR,    { recursive: true })
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

// ─── A01/A03: сохранение base64-изображения ────────────────
const IMAGE_REGEX          = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+=*$/
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB base64

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

let products = loadProducts()

function saveProducts() {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8')
}

// ─── КОЛЛЕКЦИИ ─────────────────────────────────────────────
const DEFAULT_COLLECTIONS = ['DJ XBOX360', '3.5 PROPOVEDNIK COLLECTION']

function loadCollections() {
  if (!fs.existsSync(COLLECTIONS_FILE)) {
    fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(DEFAULT_COLLECTIONS, null, 2), 'utf-8')
    return [...DEFAULT_COLLECTIONS]
  }
  try { return JSON.parse(fs.readFileSync(COLLECTIONS_FILE, 'utf-8')) }
  catch { return [...DEFAULT_COLLECTIONS] }
}

let collections = loadCollections()

function saveCollections() {
  fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(collections, null, 2), 'utf-8')
}

module.exports = {
  DATA_DIR,
  UPLOADS_DIR,
  saveBase64Image,
  // products — getProducts() возвращает живой массив (можно мутировать),
  // setProducts() заменяет ссылку (нужно для filter при удалении).
  getProducts:    () => products,
  setProducts:    (next) => { products = next },
  saveProducts,
  // collections — аналогично
  getCollections: () => collections,
  setCollections: (next) => { collections = next },
  saveCollections,
}
