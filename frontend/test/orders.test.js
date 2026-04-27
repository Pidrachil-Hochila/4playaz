// Tests for /admin/orders page + useApi orders flow
// Run: node --test test/orders.test.js

const test   = require('node:test')
const assert = require('node:assert/strict')
const fs     = require('node:fs')
const path   = require('node:path')

const apiSrc    = fs.readFileSync(path.join(__dirname, '..', 'composables', 'useApi.ts'), 'utf-8')
const ordersSrc = fs.readFileSync(path.join(__dirname, '..', 'pages', 'admin', 'orders.vue'), 'utf-8')
const loginSrc  = fs.readFileSync(path.join(__dirname, '..', 'pages', 'admin', 'login.vue'), 'utf-8')

// ─── TOKEN CONSISTENCY ────────────────────────────────────────

test('login.vue saves token under key "admin_token"', () => {
  assert.match(loginSrc, /setItem\s*\(\s*['"]admin_token['"]/, 'must call localStorage.setItem("admin_token", ...)')
})

test('useApi.ts reads token from "admin_token" key', () => {
  assert.match(apiSrc, /getItem\s*\(\s*['"]admin_token['"]/, 'getToken must use localStorage.getItem("admin_token")')
})

test('token key is identical in login and getToken ("admin_token")', () => {
  const loginKey   = loginSrc.match(/setItem\s*\(\s*['"](\w+)['"]/)
  const apiKey     = apiSrc.match(/getItem\s*\(\s*['"](\w+)['"]/)
  assert.ok(loginKey,  'login must call localStorage.setItem')
  assert.ok(apiKey,    'useApi must call localStorage.getItem')
  assert.equal(loginKey[1], apiKey[1], 'token key must match between login and getToken')
})

// ─── getOrders URL ────────────────────────────────────────────

test('getOrders calls /api/orders (not /api/admin/orders)', () => {
  assert.match(apiSrc,    /`\$\{base\}\/api\/orders`/,       'getOrders must call ${base}/api/orders')
  assert.doesNotMatch(apiSrc, /\/api\/admin\/orders/,        'must NOT call /api/admin/orders')
})

test('getOrders with pending=true appends ?pending=1', () => {
  assert.match(apiSrc, /\/api\/orders\?pending=1/, 'must append ?pending=1 for pendingOnly=true')
})

test('getOrders sends Authorization: Bearer header', () => {
  const getOrdersBlock = apiSrc.slice(
    apiSrc.indexOf('const getOrders'),
    apiSrc.indexOf('const sendPaymentLink')
  )
  assert.match(getOrdersBlock, /Authorization.*Bearer/, 'getOrders must send Authorization Bearer header')
  assert.match(getOrdersBlock, /getToken\(\)/, 'getOrders must call getToken()')
})

test('getOrders always returns an array (Array.isArray guard)', () => {
  const getOrdersBlock = apiSrc.slice(
    apiSrc.indexOf('const getOrders'),
    apiSrc.indexOf('const sendPaymentLink')
  )
  assert.match(getOrdersBlock, /Array\.isArray/, 'must have Array.isArray guard')
  assert.match(getOrdersBlock, /\[\]/, 'must fallback to [] when not array')
})

// ─── sendPaymentLink URL ──────────────────────────────────────

test('sendPaymentLink calls /api/orders/:id/send-link', () => {
  assert.match(apiSrc, /\/api\/orders\/\$\{id\}\/send-link/, 'sendPaymentLink URL must be /api/orders/:id/send-link')
})

test('sendPaymentLink sends Authorization header', () => {
  const sendBlock = apiSrc.slice(apiSrc.indexOf('const sendPaymentLink'))
  assert.match(sendBlock, /Authorization.*Bearer/, 'sendPaymentLink must send auth header')
})

// ─── orders.vue STRUCTURE ─────────────────────────────────────

test('orders.vue imports getOrders and sendPaymentLink from useAdminApi', () => {
  assert.match(ordersSrc, /useAdminApi/, 'must import from useAdminApi')
  assert.match(ordersSrc, /getOrders/, 'must use getOrders')
  assert.match(ordersSrc, /sendPaymentLink/, 'must use sendPaymentLink')
})

test('orders.vue initializes orders as empty array ref', () => {
  assert.match(ordersSrc, /ref\s*<any\[\]>\s*\(\[\]\)/, 'orders must be ref<any[]>([])')
})

test('orders.vue calls fetchOrders on mount', () => {
  assert.match(ordersSrc, /onMounted\s*\(fetchOrders\)/, 'must call fetchOrders on mount')
})

test('orders.vue handles fetch error (shows error message)', () => {
  assert.match(ordersSrc, /error\.value\s*=/, 'must set error.value on failure')
  assert.match(ordersSrc, /state-error/, 'must have error state class in template')
})

test('orders.vue loading state exists', () => {
  assert.match(ordersSrc, /loading\.value\s*=\s*true/, 'must set loading = true before fetch')
  assert.match(ordersSrc, /loading\.value\s*=\s*false/, 'must set loading = false in finally')
})

test('orders.vue filter toggle has "all" and "pending" buttons', () => {
  assert.match(ordersSrc, /filter\s*===\s*['"]all['"]/, 'must have all filter')
  assert.match(ordersSrc, /filter\s*===\s*['"]pending['"]/, 'must have pending filter')
})

test('orders.vue shows total count and pending count', () => {
  assert.match(ordersSrc, /totalCount/, 'must show totalCount')
  assert.match(ordersSrc, /pendingCount/, 'must show pendingCount')
})

test('orders.vue sends correct payload to sendPaymentLink', () => {
  assert.match(ordersSrc, /sendPaymentLink\s*\(activeOrder\.value\.id/, 'must pass order id')
  assert.match(ordersSrc, /linkInput\.value/, 'must pass payment link')
  assert.match(ordersSrc, /deliveryInput/, 'must pass delivery price')
})

test('orders.vue updates order in-place after sending link (no full reload)', () => {
  assert.match(ordersSrc, /link_sent\s*:\s*true/, 'must set link_sent=true locally after send')
  assert.match(ordersSrc, /status.*send|send.*status/, 'must update status to "send" locally')
})

// ─── ENV / API BASE GUARD ─────────────────────────────────────

test('useAdminApi warns when NUXT_PUBLIC_API_BASE is empty', () => {
  assert.match(apiSrc, /NUXT_PUBLIC_API_BASE/, 'must mention env var name')
  assert.match(apiSrc, /console\.warn|throw/, 'must warn or throw on missing apiBase')
})

test('frontend/.env exists with NUXT_PUBLIC_API_BASE set', () => {
  const envPath = path.join(__dirname, '..', '.env')
  assert.ok(fs.existsSync(envPath), 'frontend/.env must exist (copy from .env.example)')
  const env = fs.readFileSync(envPath, 'utf-8')
  assert.match(env, /NUXT_PUBLIC_API_BASE=\S+/, 'NUXT_PUBLIC_API_BASE must have a value')
})

test('frontend/.env.example exists for documentation', () => {
  const examplePath = path.join(__dirname, '..', '.env.example')
  assert.ok(fs.existsSync(examplePath), 'frontend/.env.example must exist')
})

// ─── orders.vue COLUMN DISPLAY ────────────────────────────────

test('orders.vue shows full_name column', () => {
  assert.match(ordersSrc, /order\.full_name/, 'must display full_name')
})

test('orders.vue shows phone column', () => {
  assert.match(ordersSrc, /order\.phone/, 'must display phone')
})

test('orders.vue shows telegram column', () => {
  assert.match(ordersSrc, /order\.telegram/, 'must display telegram')
})

test('orders.vue shows email column', () => {
  assert.match(ordersSrc, /order\.email/, 'must display email')
})

test('orders.vue shows product_name column', () => {
  assert.match(ordersSrc, /order\.product_name/, 'must display product_name')
})

test('orders.vue shows delivery_method and delivery_address', () => {
  assert.match(ordersSrc, /order\.delivery_method/, 'must display delivery_method')
  assert.match(ordersSrc, /order\.delivery_address/, 'must display delivery_address')
})
