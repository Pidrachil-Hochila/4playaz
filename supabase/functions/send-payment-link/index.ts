// ══════════════════════════════════════════════════════════
//  4PLAYAZ — Edge Function: send-payment-link
//  Создаёт платёж в ЮKassa по заказу и шлёт письмо со ссылкой.
//  Вызывается backend'ом (POST /api/orders/:id/send-link).
//  Тело запроса: { customer_id }   Заголовок: x-worker-secret
// ══════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WORKER_SECRET   = Deno.env.get('WORKER_SECRET') ?? 'changeme-secret-2024'
const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL      = Deno.env.get('FROM_EMAIL') ?? 'orders@4playaz.ru'
// Имя отправителя в письме: «4PLAYAZ <orders@4playaz.ru>»
const FROM = FROM_EMAIL.includes('<') ? FROM_EMAIL : `4PLAYAZ <${FROM_EMAIL}>`
const YOOKASSA_SHOP_ID    = Deno.env.get('YOOKASSA_SHOP_ID') ?? ''
const YOOKASSA_SECRET_KEY = Deno.env.get('YOOKASSA_SECRET_KEY') ?? ''
const SITE_URL        = Deno.env.get('SITE_URL') ?? 'https://4playaz.ru'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// ─── Создание платежа в ЮKassa ──────────────────────────────
async function createYookassaPayment(opts: {
  total: number
  productPrice: number
  deliveryPrice: number
  description: string
  customerId: number
  email: string | null
  phone: string | null
}) {
  const credentials = btoa(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`)

  // Чек 54-ФЗ: нужен email или телефон покупателя
  const phoneDigits = opts.phone ? opts.phone.replace(/\D/g, '') : ''
  const receiptCustomer: Record<string, string> = {}
  if (opts.email) receiptCustomer.email = opts.email
  else if (phoneDigits) receiptCustomer.phone = phoneDigits

  const items = [
    {
      description: opts.description.slice(0, 128),
      quantity: '1.00',
      amount: { value: opts.productPrice.toFixed(2), currency: 'RUB' },
      vat_code: 1,
      payment_mode: 'full_prepayment',
      payment_subject: 'commodity',
    },
  ]
  if (opts.deliveryPrice > 0) {
    items.push({
      description: 'Доставка',
      quantity: '1.00',
      amount: { value: opts.deliveryPrice.toFixed(2), currency: 'RUB' },
      vat_code: 1,
      payment_mode: 'full_prepayment',
      payment_subject: 'service',
    })
  }

  const body: Record<string, unknown> = {
    amount: { value: opts.total.toFixed(2), currency: 'RUB' },
    confirmation: { type: 'redirect', return_url: `${SITE_URL}/payment/success` },
    capture: true,
    description: opts.description.slice(0, 128),
    metadata: { customer_id: String(opts.customerId) },
  }
  if (Object.keys(receiptCustomer).length > 0) {
    body.receipt = { customer: receiptCustomer, items }
  }

  const res = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Idempotence-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('ЮKassa error:', JSON.stringify(data))
    throw new Error(data.description || 'Ошибка ЮKassa API')
  }
  return data as { id: string; confirmation: { confirmation_url: string } }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-worker-secret') !== WORKER_SECRET) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let parsed: { customer_id?: number }
  try {
    parsed = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const customerId = Number(parsed.customer_id)
  if (!customerId) {
    return json({ error: 'customer_id required' }, 400)
  }

  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    console.error('YOOKASSA_SHOP_ID/SECRET_KEY not set')
    return json({ error: 'Платёжный сервис не настроен' }, 500)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: customer, error: dbError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single()

  if (dbError || !customer) {
    return json({ error: 'Заказ не найден' }, 404)
  }

  const productPrice  = Number(customer.product_price) || 0
  const deliveryPrice = Number(customer.delivery_price) || 0
  const totalPrice    = productPrice + deliveryPrice

  if (totalPrice <= 0) {
    return json({ error: 'Сумма заказа равна нулю' }, 400)
  }

  // 1) Создаём платёж в ЮKassa
  let payment: { id: string; confirmation: { confirmation_url: string } }
  try {
    payment = await createYookassaPayment({
      total: totalPrice,
      productPrice,
      deliveryPrice,
      description: `4PLAYAZ: ${customer.product_name ?? 'заказ'}`,
      customerId,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Ошибка создания платежа' }, 500)
  }

  const paymentUrl = payment.confirmation.confirmation_url

  // 2) Сохраняем payment_id в заказ
  const { error: updError } = await supabase
    .from('customers')
    .update({ payment_id: payment.id })
    .eq('id', customerId)
  if (updError) console.error('Не удалось сохранить payment_id:', updError.message)

  // 3) Письмо со ссылкой. Если email нет — пропускаем (ссылку отдаём в ответе).
  if (!customer.email) {
    return json({ success: true, confirmation_url: paymentUrl, skipped: 'no_email' })
  }
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set')
    return json({ success: true, confirmation_url: paymentUrl, skipped: 'no_resend' })
  }

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' руб.'
  const deliveryMethodLabel = (m: string | null) => {
    if (m === 'pvz')     return 'ПВЗ СДЭК'
    if (m === 'courier') return 'Курьер'
    if (m === 'cdek')    return 'CDEK'
    if (m === 'yandex')  return 'Яндекс Доставка'
    if (m === 'pochta')  return 'Почта России'
    return m || '-'
  }

  const rows = [
    ['ФИО', customer.full_name || '-'],
    customer.phone    ? ['Телефон', customer.phone]      : null,
    customer.telegram ? ['Telegram', customer.telegram]  : null,
    ['Email', customer.email],
    ['Товар', customer.product_name || '-'],
    customer.product_size ? ['Размер', customer.product_size] : null,
    ['Стоимость товаров', fmt(productPrice)],
    ['Доставка', deliveryPrice > 0 ? fmt(deliveryPrice) : 'Уточняется'],
    ['Способ доставки', deliveryMethodLabel(customer.delivery_method)],
    ['Адрес доставки', customer.delivery_address || '-'],
  ]
    .filter(Boolean)
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 12px;color:#666;white-space:nowrap;vertical-align:top;">${label}</td>
          <td style="padding:8px 12px;color:#111;">${value}</td>
        </tr>`,
    )
    .join('')

  const emailHtml = `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e0e0e0;">
    <div style="background:#111;padding:24px 32px;">
      <p style="margin:0;font-size:22px;font-weight:bold;color:#fff;letter-spacing:2px;">4PLAYAZ</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:20px;color:#111;">Ссылка на оплату вашего заказа</h2>
      <p style="margin:0 0 24px;color:#666;font-size:14px;">Проверьте данные заказа и перейдите по ссылке для оплаты.</p>

      <table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0;margin-bottom:28px;">
        ${rows}
        <tr style="border-top:2px solid #111;">
          <td style="padding:12px;font-weight:bold;font-size:15px;">ИТОГО К ОПЛАТЕ</td>
          <td style="padding:12px;font-weight:bold;font-size:18px;color:#111;">${fmt(totalPrice)}</td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
        <tr>
          <td style="background:#fff8e1;border-left:4px solid #f5a623;padding:16px 18px;">
            <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#111;">💚 Поддержите магазин — оплатите через СБП</p>
            <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">
              На странице оплаты нажмите <b style="color:#111;">«Ещё способы»</b>, затем выберите
              <b style="color:#111;">«СБП»</b> (оплата по QR-коду или через приложение вашего банка).
              Для вас сумма та же, а магазину так выгоднее. Спасибо!
            </p>
          </td>
        </tr>
      </table>

      <a href="${paymentUrl}"
         style="display:inline-block;background:#111;color:#fff;text-decoration:none;
                padding:16px 36px;font-size:15px;font-weight:bold;letter-spacing:1px;">
        ПЕРЕЙТИ К ОПЛАТЕ
      </a>

      <p style="margin:28px 0 0;font-size:12px;color:#999;line-height:1.7;">
        Если вы не оформляли заказ в магазине 4PLAYAZ -- проигнорируйте это письмо.<br>
        По вопросам пишите в Telegram: @playaz_store
      </p>
    </div>
  </div>
</body>
</html>`

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [customer.email],
      subject: 'Ссылка на оплату заказа -- 4PLAYAZ',
      html: emailHtml,
    }),
  })

  if (!emailRes.ok) {
    const err = await emailRes.text()
    console.error('Resend error:', err)
    // Платёж уже создан — отдаём ссылку, чтобы админ отправил вручную.
    return json({ success: true, confirmation_url: paymentUrl, skipped: 'email_failed' })
  }

  return json({ success: true, confirmation_url: paymentUrl })
})
