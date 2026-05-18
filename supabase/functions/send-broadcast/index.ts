// ══════════════════════════════════════════════════════════
//  4PLAYAZ — Edge Function: send-broadcast
//  Массовая рассылка письма покупателям. Текст от админа
//  оборачивается в фирменный HTML-шаблон 4PLAYAZ.
//  Вызывается backend'ом (POST /api/broadcast/send).
//  Тело: { subject, text, recipients: string[] }
//  Заголовок: x-worker-secret
// ══════════════════════════════════════════════════════════

const WORKER_SECRET  = Deno.env.get('WORKER_SECRET') ?? 'changeme-secret-2024'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'store@4playaz.ru'
// Имя отправителя в письме: «4PLAYAZ <store@4playaz.ru>»
const FROM = FROM_EMAIL.includes('<') ? FROM_EMAIL : `4PLAYAZ <${FROM_EMAIL}>`

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// Экранируем HTML из пользовательского ввода, переносы строк → <br>.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildHtml(subject: string, text: string): string {
  const bodyHtml = escapeHtml(text).replace(/\r?\n/g, '<br>')
  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e0e0e0;">
    <div style="background:#111;padding:24px 32px;">
      <p style="margin:0;font-size:22px;font-weight:bold;color:#fff;letter-spacing:2px;">4PLAYAZ</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 18px;font-size:20px;color:#111;">${escapeHtml(subject)}</h2>
      <div style="font-size:15px;color:#333;line-height:1.75;">${bodyHtml}</div>
      <p style="margin:32px 0 0;font-size:12px;color:#999;line-height:1.7;border-top:1px solid #e0e0e0;padding-top:16px;">
        Вы получили это письмо, потому что оформляли заказ в магазине 4PLAYAZ.<br>
        По вопросам пишите в Telegram: @playaz_store
      </p>
    </div>
  </div>
</body>
</html>`
}

// Разбивка массива на куски по size элементов.
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

Deno.serve(async (req) => {
  if (req.headers.get('x-worker-secret') !== WORKER_SECRET) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let body: { subject?: string; text?: string; recipients?: string[] }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const subject = String(body.subject || '').trim()
  const text    = String(body.text || '').trim()
  const recipients = Array.isArray(body.recipients)
    ? [...new Set(body.recipients.map((e) => String(e).trim().toLowerCase()).filter(Boolean))]
    : []

  if (!subject || !text) {
    return json({ error: 'subject и text обязательны' }, 400)
  }
  if (recipients.length === 0) {
    return json({ error: 'Список получателей пуст' }, 400)
  }
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set')
    return json({ error: 'Почтовый сервис не настроен' }, 500)
  }

  const html = buildHtml(subject, text)
  let sent = 0
  const errors: string[] = []

  // Resend batch API принимает до 100 писем за запрос — у каждого свой to.
  for (const group of chunk(recipients, 100)) {
    const payload = group.map((to) => ({
      from: FROM,
      to: [to],
      subject,
      html,
    }))

    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        sent += group.length
      } else {
        const errText = await res.text()
        console.error('Resend batch error:', errText)
        errors.push(errText)
      }
    } catch (err) {
      console.error('Resend batch fetch failed:', err)
      errors.push(String(err))
    }
  }

  if (sent === 0) {
    return json({ error: errors[0] || 'Не удалось отправить рассылку' }, 500)
  }

  return json({ success: true, sent, total: recipients.length, failed: recipients.length - sent })
})
