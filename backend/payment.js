// ══════════════════════════════════════════════════════════
//  4PLAYAZ — backend/payment.js
//  Маршруты для ЮКасса + сохранение покупателей в Supabase
// ══════════════════════════════════════════════════════════

const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const { createClient } = require('@supabase/supabase-js')

// ─── CONFIG (заполни в .env) ───────────────────────────────
const YOOKASSA_SHOP_ID   = process.env.YOOKASSA_SHOP_ID
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY
const SUPABASE_URL        = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const SITE_URL            = process.env.SITE_URL || 'http://localhost:3000'

// ─── SUPABASE CLIENT (опционально) ──────────────────────────
// Если SUPABASE_URL/KEY не заданы — работаем без БД, только ЮКасса.
let supabase = null
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
} else {
  console.warn('⚠️  SUPABASE_URL/SUPABASE_SERVICE_KEY не заданы — заказы не сохраняются в БД')
}

// ─── HELPER: ЮКасса API ─────────────────────────────────────
const yookassaRequest = async (method, path, body = null) => {
  const credentials = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64')
  const opts = {
    method,
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Idempotence-Key': uuidv4(),
    }
  }
  if (body) opts.body = JSON.stringify(body)

  const fetch = (await import('node-fetch')).default
  const res = await fetch(`https://api.yookassa.ru/v3${path}`, opts)
  const data = await res.json()
  if (!res.ok) {
  console.error('ЮКасса ответ:', JSON.stringify(data, null, 2))
   throw new Error(data.description || 'ЮКасса API error')
}
  return data
}

// ─── POST /api/payment/create ──────────────────────────────
router.post('/create', async (req, res) => {
  try {
    const { productId, productName, amount, customer, delivery } = req.body

    const hasEmail    = Boolean(customer?.email?.trim())
    const hasTelegram = Boolean(customer?.telegram?.trim())
    if (!productName || !amount || !hasEmail || !hasTelegram) {
      return res.status(400).json({ message: 'Укажите email И Telegram username' })
    }
    const contact = customer.email

    const productPrice  = Number(amount)
    const deliveryPrice = Number(delivery?.deliveryPrice || 0)
    const totalAmount   = productPrice + deliveryPrice

    // 1) Сохраняем покупателя в Supabase (если настроена)
    if (supabase) {
      const { error: dbError } = await supabase
        .from('customers')
        .insert({
          full_name:       customer.fullName || contact,
          phone:           customer.phone || null,
          telegram:        customer.telegram || null,
          email:           customer.email || '',
          product_id:      productId || null,
          product_name:    productName,
          product_price:   productPrice,
          delivery_price:  deliveryPrice,
          delivery_method: delivery?.method || null,
          delivery_address: [delivery?.postalCode, delivery?.city, delivery?.address]
                              .filter(Boolean).join(', '),
          created_at:      new Date().toISOString(),
          status:          'pending',
        })

      if (dbError) {
        console.error('Supabase insert error:', dbError)
        // Не блокируем — продолжаем создавать платёж
      }
    }

    // 2) Создаём платёж в ЮКасса
    const payment = await yookassaRequest('POST', '/payments', {
      amount: {
        value: totalAmount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'redirect',
        return_url: `${SITE_URL}/payment/success`,
      },
      capture: true,
      description: `4PLAYAZ: ${productName}${deliveryPrice > 0 ? ` + доставка ${deliveryPrice} ₽` : ''}`,
      metadata: {
        product_name:     productName,
        customer_name:    customer.fullName || contact,
        customer_email:   customer.email || '',
        customer_telegram: customer.telegram || '',
        delivery_method:  delivery?.method || '',
        product_price:    String(productPrice),
        delivery_price:   String(deliveryPrice),
      },
      receipt: customer.email ? {
        customer: { email: customer.email },
        items: [
          {
            description: productName,
            quantity: '1.00',
            amount: { value: productPrice.toFixed(2), currency: 'RUB' },
            vat_code: 1,
            payment_mode: 'full_prepayment',
            payment_subject: 'commodity',
          },
          ...(deliveryPrice > 0 ? [{
            description: 'Доставка СДЭК',
            quantity: '1.00',
            amount: { value: deliveryPrice.toFixed(2), currency: 'RUB' },
            vat_code: 1,
            payment_mode: 'full_prepayment',
            payment_subject: 'service',
          }] : []),
        ],
      } : undefined,
    })

    // 3) Обновляем статус с payment_id (если БД настроена)
    if (supabase) {
      const lookupCol = customer.email ? 'email' : 'telegram'
      const lookupVal = customer.email || customer.telegram
      await supabase
        .from('customers')
        .update({ payment_id: payment.id, status: 'created' })
        .eq(lookupCol, lookupVal)
        .order('created_at', { ascending: false })
        .limit(1)
    }

    res.json({
      paymentId: payment.id,
      confirmationUrl: payment.confirmation.confirmation_url
    })

  } catch (err) {
    console.error('Payment create error:', err)
    res.status(500).json({ message: err.message || 'Ошибка создания платежа' })
  }
})

// ─── POST /api/payment/webhook ─────────────────────────────
// Вебхук от ЮКасса — вставь этот URL в личном кабинете ЮКасса
// URL: https://ТВОЙ_ДОМЕН/api/payment/webhook
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body
    if (event.event === 'payment.succeeded') {
      const paymentId = event.object.id
      if (supabase) {
        await supabase
          .from('customers')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('payment_id', paymentId)
      }
      console.log(`Payment ${paymentId} marked as paid`)
    }
    res.sendStatus(200)
  } catch (err) {
    console.error('Webhook error:', err)
    res.sendStatus(500)
  }
})

// ─── GET /api/payment/status/:id ───────────────────────────
router.get('/status/:id', async (req, res) => {
  try {
    const payment = await yookassaRequest('GET', `/payments/${req.params.id}`)
    res.json({ status: payment.status })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
