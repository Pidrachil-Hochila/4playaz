// ══════════════════════════════════════════════════════════
//  4PLAYAZ — backend/broadcast.js
//  Массовая рассылка писем покупателям из базы (Supabase).
//  Само письмо отправляет Edge Function send-broadcast (Resend).
// ══════════════════════════════════════════════════════════

const express = require('express')
const router  = express.Router()
const jwt     = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL         = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const WORKER_SECRET        = process.env.WORKER_SECRET || 'changeme-secret-2024'

let supabase = null
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next() }
  catch { return res.status(401).json({ error: 'Invalid token' }) }
}

// ─── Уникальные валидные email из таблицы customers ────────
async function collectEmails() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('customers')
    .select('email')
    .not('email', 'is', null)
  if (error) throw new Error(error.message)

  const seen = new Set()
  for (const row of data || []) {
    const email = String(row.email || '').trim().toLowerCase()
    if (EMAIL_RE.test(email)) seen.add(email)
  }
  return [...seen]
}

// ─── GET /api/broadcast/recipients ── число уникальных адресов
router.get('/recipients', authMiddleware, async (req, res) => {
  try {
    const emails = await collectEmails()
    res.json({ count: emails.length })
  } catch (err) {
    res.status(500).json({ message: err.message || 'Ошибка' })
  }
})

// ─── POST /api/broadcast/send ── разослать письмо ───────────
// Тело: { subject, text, testEmail? }
// Если задан testEmail — письмо уходит только на этот адрес.
router.post('/send', authMiddleware, async (req, res) => {
  const subject = String(req.body?.subject || '').trim()
  const text    = String(req.body?.text || '').trim()
  const testRaw = String(req.body?.testEmail || '').trim().toLowerCase()

  if (!subject) return res.status(400).json({ message: 'Укажите тему письма' })
  if (!text)    return res.status(400).json({ message: 'Введите текст письма' })

  try {
    let recipients
    if (testRaw) {
      if (!EMAIL_RE.test(testRaw)) {
        return res.status(400).json({ message: 'Некорректный email для теста' })
      }
      recipients = [testRaw]
    } else {
      recipients = await collectEmails()
      if (recipients.length === 0) {
        return res.status(400).json({ message: 'В базе нет адресов для рассылки' })
      }
    }

    const fetch = (await import('node-fetch')).default
    const fnRes = await fetch(`${SUPABASE_URL}/functions/v1/send-broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-worker-secret': WORKER_SECRET,
      },
      body: JSON.stringify({ subject, text, recipients }),
    })

    const fnData = await fnRes.json().catch(() => ({}))
    if (!fnRes.ok) {
      return res.status(500).json({ message: fnData.error || 'Ошибка отправки рассылки' })
    }

    console.log(`[BROADCAST]${testRaw ? ' TEST' : ''} «${subject}» → ${fnData.sent ?? recipients.length} адр.`)
    res.json({ success: true, sent: fnData.sent ?? recipients.length })
  } catch (err) {
    console.error('Broadcast error:', err)
    res.status(500).json({ message: err.message || 'Ошибка рассылки' })
  }
})

module.exports = router
