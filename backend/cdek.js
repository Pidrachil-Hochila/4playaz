// ══════════════════════════════════════════════════════════
//  4PLAYAZ — backend/cdek.js
//  СДЭК API: авторизация + расчёт стоимости доставки
// ══════════════════════════════════════════════════════════

const express = require('express')
const router = express.Router()

const CDEK_CLIENT_ID     = process.env.CDEK_CLIENT_ID
const CDEK_CLIENT_SECRET = process.env.CDEK_CLIENT_SECRET
const CDEK_ENABLED       = Boolean(CDEK_CLIENT_ID && CDEK_CLIENT_SECRET)

if (!CDEK_ENABLED) {
  console.warn('⚠️  CDEK_CLIENT_ID/CDEK_CLIENT_SECRET не заданы — расчёт доставки СДЭК отключён')
}

// Тестовая среда: https://api.edu.cdek.ru/v2
// Боевая среда:   https://api.cdek.ru/v2
const CDEK_API = process.env.CDEK_API_URL || 'https://api.edu.cdek.ru/v2'

// Адрес отправителя (склад)
const SENDER_CITY_CODE = 137 // Санкт-Петербург (код города СДЭК)
const SENDER_ADDRESS   = 'ул. Антонова-Овсеенко, 25, стр.корп. 1, оф.пом2-Н'

// ─── Кеш токена ────────────────────────────────────────────
let tokenCache = { token: null, expiresAt: 0 }

async function getCdekToken() {
  if (!CDEK_ENABLED) throw new Error('СДЭК не настроен на сервере')
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token
  }

  const fetch = (await import('node-fetch')).default
  const params = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     CDEK_CLIENT_ID,
    client_secret: CDEK_CLIENT_SECRET,
  })

  const res = await fetch(`${CDEK_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CDEK auth error: ${res.status} ${text}`)
  }

  const data = await res.json()
  tokenCache.token     = data.access_token
  tokenCache.expiresAt = Date.now() + (data.expires_in - 60) * 1000
  return tokenCache.token
}

async function cdekRequest(method, path, body = null) {
  const fetch = (await import('node-fetch')).default
  const token = await getCdekToken()
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res  = await fetch(`${CDEK_API}${path}`, opts)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.requests?.[0]?.errors?.[0]?.message || `CDEK error ${res.status}`)
  return data
}

// ─── POST /api/cdek/calculate ──────────────────────────────
// body: { to_location: { code } | { postal_code } | { city }, weight: number (г), tariff_code?: number }
// Тарифы: 136 = до ПВЗ, 137 = курьер до двери, 138 = до постамата
router.post('/calculate', async (req, res) => {
  try {
    const { to_location, weight = 500, tariff_code = 136 } = req.body

    if (!to_location) {
      return res.status(400).json({ error: 'Укажите to_location' })
    }

    const payload = {
      tariff_code,
      from_location: { code: SENDER_CITY_CODE },
      to_location,
      packages: [{ weight, length: 30, width: 25, height: 5 }],
    }

    const data = await cdekRequest('POST', '/calculator/tariff', payload)

    res.json({
      delivery_sum:  data.delivery_sum,
      period_min:    data.period_min,
      period_max:    data.period_max,
      tariff_code,
    })
  } catch (err) {
    console.error('[CDEK calculate]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/cdek/city?q=Москва ──────────────────────────
// Поиск кода города по названию (нужен для расчёта курьера)
router.get('/city', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 100)
    if (!q) return res.status(400).json({ error: 'Укажите q' })

    const data = await cdekRequest('GET', `/location/cities?country_codes=RU&city=${encodeURIComponent(q)}&size=5`)
    res.json(data)
  } catch (err) {
    console.error('[CDEK city]', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.SENDER_CITY_CODE = SENDER_CITY_CODE
module.exports.SENDER_ADDRESS   = SENDER_ADDRESS
