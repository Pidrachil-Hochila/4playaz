// ══════════════════════════════════════════════════════════
//  4PLAYAZ — backend/orders.js
//  Создание заказов + admin-эндпоинты для отправки ссылок
// ══════════════════════════════════════════════════════════

const express = require('express')
const router  = express.Router()
const jwt     = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL      = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const WORKER_SECRET     = process.env.WORKER_SECRET || 'changeme-secret-2024'

let supabase = null
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
} else {
  console.warn('⚠️  SUPABASE_URL/SUPABASE_SERVICE_KEY не заданы — заказы не сохраняются')
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next() }
  catch { return res.status(401).json({ error: 'Invalid token' }) }
}

// ─── POST /api/orders/create ── публичный, сохраняет заказ ─
router.post('/create', async (req, res) => {
  try {
    const { productName, productSize, amount, customer, delivery } = req.body

    if (!productName) {
      return res.status(400).json({ message: 'Укажите название товара' })
    }
    if (!customer?.phone?.trim() && !customer?.email?.trim()) {
      return res.status(400).json({ message: 'Укажите телефон или email' })
    }

    if (supabase) {
      const { error } = await supabase.from('customers').insert({
        full_name:        customer.fullName?.trim() || customer.email || '-',
        phone:            customer.phone?.trim()    || null,
        telegram:         customer.telegram?.trim() || null,
        email:            customer.email?.trim()    || null,
        product_name:     productName,
        product_size:     productSize?.trim() || null,
        product_price:    Number(amount) || 0,
        delivery_price:   Number(delivery?.deliveryPrice || 0),
        delivery_method:  delivery?.method   || null,
        delivery_address: delivery?.address  || null,
        created_at:       new Date().toISOString(),
        status:           'wait',
        link_sent:        false,
      })

      if (error) {
        console.error('Supabase insert error:', error)
        return res.status(500).json({ message: 'Ошибка сохранения заказа' })
      }
    }

    console.log('[ORDER] Новый заказ:', productName, customer.phone || customer.email)
    res.json({ success: true })
  } catch (err) {
    console.error('Order create error:', err)
    res.status(500).json({ message: err.message || 'Ошибка создания заказа' })
  }
})

// ─── GET /api/admin/orders ── список всех заказов ──────────
// Параметр ?pending=1 — только те, кому ещё не отправляли ссылку и не оплачено.
router.get('/', authMiddleware, async (req, res) => {
  if (!supabase) return res.json([])
  try {
    let q = supabase
      .from('customers')
      .select('id, full_name, phone, telegram, email, product_name, product_size, product_price, delivery_price, delivery_method, delivery_address, status, link_sent, payment_id, paid_at, created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (req.query.pending === '1') {
      q = q.eq('link_sent', false).neq('status', 'paid')
    }

    const { data, error } = await q
    if (error) return res.status(500).json({ message: error.message })
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ─── POST /api/admin/orders/:id/send-link ── отправить ссылку
router.post('/:id/send-link', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ message: 'Некорректный ID' })

  const { paymentLink, deliveryPrice } = req.body
  if (!paymentLink?.trim()) return res.status(400).json({ message: 'Укажите ссылку на оплату' })

  const delivery = Number(deliveryPrice) || 0

  try {
    // Сохраняем сумму доставки до вызова Edge Function — письмо возьмёт актуальные данные из БД
    if (supabase) {
      await supabase
        .from('customers')
        .update({ delivery_price: delivery })
        .eq('id', id)
    }

    const fetch = (await import('node-fetch')).default

    const fnRes = await fetch(`${SUPABASE_URL}/functions/v1/send-payment-link`, {
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-worker-secret': WORKER_SECRET,
      },
      body: JSON.stringify({ customer_id: id, payment_url: paymentLink.trim() }),
    })

    if (!fnRes.ok) {
      const errData = await fnRes.json()
      return res.status(500).json({ message: errData.error || 'Ошибка отправки письма' })
    }

    if (supabase) {
      await supabase
        .from('customers')
        .update({ link_sent: true, status: 'send' })
        .eq('id', id)
    }

    console.log(`[LINK SENT] order #${id} → ${paymentLink.trim()}`)
    res.json({ success: true })
  } catch (err) {
    console.error('Send link error:', err)
    res.status(500).json({ message: err.message || 'Ошибка' })
  }
})

module.exports = router
