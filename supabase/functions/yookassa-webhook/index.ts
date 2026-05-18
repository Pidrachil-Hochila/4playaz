// ══════════════════════════════════════════════════════════
//  4PLAYAZ — Edge Function: yookassa-webhook
//  Принимает HTTP-уведомления ЮKassa (payment.succeeded и др.).
//  URL в ЛК ЮKassa:
//    https://<project>.supabase.co/functions/v1/yookassa-webhook
//  Публичная (verify_jwt отключён) — ЮKassa не присылает JWT.
//  Webhook ЮKassa не подписан, поэтому факт оплаты перепроверяем
//  запросом GET /v3/payments/{id} с Basic-авторизацией магазина.
// ══════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const YOOKASSA_SHOP_ID    = Deno.env.get('YOOKASSA_SHOP_ID') ?? ''
const YOOKASSA_SECRET_KEY = Deno.env.get('YOOKASSA_SECRET_KEY') ?? ''

// ЮKassa повторяет попытки при не-2xx ответе, поэтому почти всегда отвечаем 200.
const ok = (body: unknown = { ok: true }) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let payload: { event?: string; object?: { id?: string; status?: string } }
  try {
    payload = await req.json()
  } catch {
    return ok({ ignored: 'invalid_json' })
  }

  const event     = payload.event ?? ''
  const paymentId = payload.object?.id

  if (event !== 'payment.succeeded' || !paymentId) {
    return ok({ ignored: event || 'no_event' })
  }

  // Перепроверяем платёж напрямую в ЮKassa — webhook можно подделать.
  try {
    const credentials = btoa(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`)
    const res = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
      headers: { 'Authorization': `Basic ${credentials}` },
    })
    const payment = await res.json()
    if (!res.ok || payment.status !== 'succeeded') {
      console.error('Платёж не подтверждён ЮKassa:', paymentId, JSON.stringify(payment))
      return ok({ ignored: 'not_succeeded' })
    }
  } catch (err) {
    console.error('Ошибка проверки платежа ЮKassa:', err)
    // Не помечаем оплаченным без подтверждения.
    return ok({ ignored: 'verify_failed' })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await supabase
    .from('customers')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('payment_id', paymentId)
    .neq('status', 'paid')
    .select('id')

  if (error) {
    console.error('Ошибка обновления заказа:', error.message)
    return ok({ error: 'db_update_failed' })
  }

  console.log(`[YOOKASSA] payment ${paymentId} → paid, заказов обновлено: ${data?.length ?? 0}`)
  return ok({ success: true, updated: data?.length ?? 0 })
})
