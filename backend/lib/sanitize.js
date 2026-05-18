// ══════════════════════════════════════════════════════════
//  4PLAYAZ — backend/lib/sanitize.js
//  A03: санитизация строк + whitelist значений
// ══════════════════════════════════════════════════════════

const ALLOWED_BADGES   = ['', 'New', 'Best Seller', 'Sale', 'Pre-Order', 'Exclusive']
const ALLOWED_CLOTHING = ['', 'hoodie', 'tshirt', 'longsleeve', 'jacket', 'pants', 'accessories']

function sanitizeString(val, maxLen = 300) {
  if (typeof val !== 'string') return ''
  return val.replace(/[<>]/g, '').trim().slice(0, maxLen)
}

module.exports = { ALLOWED_BADGES, ALLOWED_CLOTHING, sanitizeString }
