// ══════════════════════════════════════════════════════════
//  4PLAYAZ — backend/routes/admin-auth.js
//  Логин админки (пароль + TOTP + rate limit), настройка TOTP,
//  просмотр и снятие IP-банов.
// ══════════════════════════════════════════════════════════

const express   = require('express')
const jwt       = require('jsonwebtoken')
const speakeasy = require('speakeasy')
const QRCode    = require('qrcode')
const router    = express.Router()

const security = require('../lib/security')
const { getAdmins, getAdminSecret, loadSecrets, saveSecrets, authMiddleware } = require('../lib/auth')
const { sanitizeString } = require('../lib/sanitize')

// ─── LOGIN: rate limit + IP ban ────────────────────────────
router.post('/api/admin/login', (req, res) => {
  const ip = security.getClientIp(req)

  // Проверяем бан
  if (security.isIpBanned(ip)) {
    const entry     = security.getEntry(ip)
    const remaining = Math.ceil((security.BAN_DURATION - (Date.now() - entry.bannedAt)) / 3600000)
    console.warn(`[BLOCKED] Попытка входа с забаненного IP: ${ip}`)
    return res.status(429).json({
      error: `Слишком много неудачных попыток. IP заблокирован на ${remaining} ч.`,
    })
  }

  const { username, password, totp } = req.body

  if (!username || !password || !totp) {
    return res.status(400).json({ error: 'Заполните все поля, включая код из приложения' })
  }

  // A07: user enumeration — одно сообщение для любой ошибки логин/пароль
  const admin      = getAdmins()[username?.toLowerCase()]
  const passwordOk = admin && admin.password === password.trim()

  if (!admin || !passwordOk) {
    security.recordFailedAttempt(ip)
    const left = security.MAX_ATTEMPTS - (security.getEntry(ip)?.count || 0)
    const msg  = left > 0
      ? `Неверные данные для входа. Осталось попыток: ${left}`
      : 'IP адрес заблокирован за превышение лимита попыток'
    return res.status(401).json({ error: msg })
  }

  // Проверяем TOTP
  const secret = getAdminSecret(username.toLowerCase())
  if (!secret) {
    return res.status(500).json({ error: `TOTP не настроен. Открой: /api/admin/setup-totp/${username}` })
  }

  const verified = speakeasy.totp.verify({
    secret, encoding: 'base32',
    token: totp.toString().trim(), window: 1,
  })

  if (!verified) {
    security.recordFailedAttempt(ip)
    const left = security.MAX_ATTEMPTS - (security.getEntry(ip)?.count || 0)
    const msg  = left > 0
      ? `Неверный код из приложения. Осталось попыток: ${left}`
      : 'IP адрес заблокирован за превышение лимита попыток'
    return res.status(401).json({ error: msg })
  }

  // Успешный вход — сбрасываем счётчик
  security.resetAttempts(ip)
  const token = jwt.sign(
    { username: username.toLowerCase(), role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '12h' },
  )
  console.log('[LOGIN OK]', username.toLowerCase(), 'from', ip)
  res.json({ token })
})

// ─── ADMIN: просмотр бан-листа (только для отладки) ────────
router.get('/api/admin/banlist', authMiddleware, (req, res) => {
  const bl = security.loadBanlist()
  const result = Object.entries(bl).map(([ip, data]) => ({
    ip,
    attempts: data.count,
    banned: !!data.bannedAt,
    bannedAt: data.bannedAt ? new Date(data.bannedAt).toISOString() : null,
    expiresIn: data.bannedAt
      ? `${Math.ceil((security.BAN_DURATION - (Date.now() - data.bannedAt)) / 60000)} мин`
      : null,
  }))
  res.json(result)
})

// ─── ADMIN: разбанить IP вручную ───────────────────────────
router.delete('/api/admin/banlist/:ip', authMiddleware, (req, res) => {
  const ip = req.params.ip
  security.resetAttempts(ip)
  console.log('[UNBAN]', ip)
  res.json({ ok: true, message: `IP ${ip} разблокирован` })
})

// ─── SETUP TOTP (одноразовый маршрут) ──────────────────────
router.get('/api/admin/setup-totp/:username', async (req, res) => {
  const username = sanitizeString(req.params.username, 50).toLowerCase()
  if (!getAdmins()[username]) return res.status(404).send('Пользователь не найден')

  const secrets = loadSecrets()
  if (secrets[username]) {
    return res.send(`<h2>TOTP для ${username} уже настроен.</h2><p>Удали запись из data/totp_secrets.json чтобы сбросить.</p>`)
  }

  const secret = speakeasy.generateSecret({ name: `4PLAYAZ (${username})`, length: 20 })
  secrets[username] = secret.base32
  saveSecrets(secrets)

  const qr = await QRCode.toDataURL(secret.otpauth_url)
  res.send(`
    <html><body style="font-family:monospace;padding:30px;background:#111;color:#fff">
    <h2>Настройка TOTP для: ${username}</h2>
    <p>1. Установи Google Authenticator</p>
    <p>2. Отсканируй QR-код:</p>
    <img src="${qr}" style="border:4px solid #fff">
    <p>3. При входе вводи 6-значный код из приложения</p>
    <p style="color:#e74c3c;margin-top:20px">⚠️ QR показывается ОДИН РАЗ. Сохрани его!</p>
    <p>Ключ для ручного ввода: <b>${secret.base32}</b></p>
    </body></html>
  `)
})

module.exports = router
