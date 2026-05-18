// ══════════════════════════════════════════════════════════
//  4PLAYAZ — backend/lib/security.js
//  A07: rate limit входа в админку + IP-бан (3 попытки → бан 24ч).
//  banlist.json — источник истины, переживает перезапуск бэкенда.
// ══════════════════════════════════════════════════════════

const fs   = require('fs')
const path = require('path')

const BANLIST_FILE = path.join(__dirname, '..', 'data', 'banlist.json')

const MAX_ATTEMPTS = 3
const BAN_DURATION = 24 * 60 * 60 * 1000 // 24 часа (мс)

// { ip: { count: N, bannedAt: timestamp | null, lastAttempt: timestamp } }
const loginAttempts = new Map()

function loadBanlist() {
  if (!fs.existsSync(BANLIST_FILE)) return {}
  try { return JSON.parse(fs.readFileSync(BANLIST_FILE, 'utf-8')) } catch { return {} }
}
function saveBanlist(bl) {
  fs.writeFileSync(BANLIST_FILE, JSON.stringify(bl, null, 2), 'utf-8')
}

// Синхронизируем постоянный бан-файл в память при старте
for (const [ip, data] of Object.entries(loadBanlist())) {
  loginAttempts.set(ip, data)
}

function getClientIp(req) {
  // Учитываем reverse-proxy (nginx)
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

function getEntry(ip) {
  return loginAttempts.get(ip) || null
}

function isIpBanned(ip) {
  const entry = loginAttempts.get(ip)
  if (!entry || !entry.bannedAt) return false

  // banlist.json — источник истины. Если IP убрали из файла руками,
  // снимаем бан и из памяти тоже (без перезапуска бэкенда).
  const fileBl = loadBanlist()
  if (!fileBl[ip]) {
    loginAttempts.delete(ip)
    return false
  }

  const elapsed = Date.now() - entry.bannedAt
  if (elapsed >= BAN_DURATION) {
    loginAttempts.delete(ip)
    delete fileBl[ip]
    saveBanlist(fileBl)
    return false
  }
  return true
}

function recordFailedAttempt(ip) {
  const entry = loginAttempts.get(ip) || { count: 0, bannedAt: null, lastAttempt: null }
  entry.count++
  entry.lastAttempt = Date.now()

  if (entry.count >= MAX_ATTEMPTS) {
    entry.bannedAt = Date.now()
    console.warn(`[BAN] IP заблокирован: ${ip} (${MAX_ATTEMPTS} неудачных попыток)`)
  }

  loginAttempts.set(ip, entry)

  // Сохраняем бан в файл чтобы пережить перезапуск
  if (entry.bannedAt) {
    const bl = loadBanlist()
    bl[ip] = entry
    saveBanlist(bl)
  }
}

function resetAttempts(ip) {
  loginAttempts.delete(ip)
  const bl = loadBanlist()
  if (bl[ip]) { delete bl[ip]; saveBanlist(bl) }
}

module.exports = {
  MAX_ATTEMPTS,
  BAN_DURATION,
  loadBanlist,
  getClientIp,
  getEntry,
  isIpBanned,
  recordFailedAttempt,
  resetAttempts,
}
