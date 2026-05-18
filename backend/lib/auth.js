// ══════════════════════════════════════════════════════════
//  4PLAYAZ — backend/lib/auth.js
//  Админы (из .env), TOTP-секреты и JWT-middleware.
// ══════════════════════════════════════════════════════════

const fs   = require('fs')
const path = require('path')
const jwt  = require('jsonwebtoken')

const SECRETS_FILE = path.join(__dirname, '..', 'data', 'totp_secrets.json')

// ─── АДМИНЫ (ADMIN_<NAME>_PASSWORD в .env) ─────────────────
let _admins = null
function getAdmins() {
  if (_admins) return _admins
  const admins = {}
  for (const [key, val] of Object.entries(process.env)) {
    const match = key.match(/^ADMIN_(.+)_PASSWORD$/)
    if (match && val) {
      const username = match[1].toLowerCase()
      admins[username] = {
        password:   val,
        totpSecret: process.env[`TOTP_SECRET_${match[1].toUpperCase()}`] || '',
      }
    }
  }
  _admins = admins
  return admins
}

// ─── TOTP-СЕКРЕТЫ ──────────────────────────────────────────
function loadSecrets() {
  if (!fs.existsSync(SECRETS_FILE)) return {}
  try { return JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf-8')) } catch { return {} }
}
function saveSecrets(s) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(s, null, 2), 'utf-8')
}
function getAdminSecret(username) {
  const f = loadSecrets()
  return f[username] || getAdmins()[username]?.totpSecret || null
}

// ─── JWT MIDDLEWARE ────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next() }
  catch { return res.status(401).json({ error: 'Invalid token' }) }
}

module.exports = { getAdmins, loadSecrets, saveSecrets, getAdminSecret, authMiddleware }
