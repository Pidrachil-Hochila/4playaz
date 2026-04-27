// Tests for orders.js — route structure, data mapping, auth
// Run: node --test test/orders.test.js

const test   = require('node:test')
const assert = require('node:assert/strict')
const fs     = require('node:fs')
const path   = require('node:path')

const src = fs.readFileSync(path.join(__dirname, '..', 'orders.js'), 'utf-8')

// ─── MODULE ───────────────────────────────────────────────────

test('orders.js loads without crashing when SUPABASE env is missing', () => {
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_KEY
  delete require.cache[require.resolve('../orders.js')]
  assert.doesNotThrow(() => require('../orders.js'))
})

test('orders.js exports an Express router', () => {
  const router = require('../orders.js')
  assert.equal(typeof router,      'function', 'must export a function')
  assert.equal(typeof router.get,  'function', 'router.get must exist')
  assert.equal(typeof router.post, 'function', 'router.post must exist')
})

// ─── ROUTE PATHS ──────────────────────────────────────────────

test('GET / route exists (list orders)', () => {
  assert.match(src, /router\.get\s*\(\s*['"]\/['"]/, 'GET / must be registered')
})

test('POST /create route exists (public order creation)', () => {
  assert.match(src, /router\.post\s*\(\s*['"]\/create['"]/, 'POST /create must be registered')
})

test('POST /:id/send-link route exists', () => {
  assert.match(src, /router\.post\s*\(\s*['"\/:]+id['"\/]+send-link/, 'POST /:id/send-link must be registered')
})

test('/create route is defined BEFORE /:id to prevent Express shadowing', () => {
  const createIdx  = src.indexOf("'/create'")
  const dynamicIdx = src.indexOf("'/:id/")
  assert.ok(createIdx !== -1,  "'/create' route must exist")
  assert.ok(dynamicIdx !== -1, "'/:id/' route must exist")
  assert.ok(createIdx < dynamicIdx, '/create must be defined before /:id')
})

// ─── ROUTE MOUNT PATH ─────────────────────────────────────────

test('GET route is at "/" not "/admin/orders" (check server.js mount path)', () => {
  // The router is mounted at /api/orders in server.js.
  // The handler must be at '/' so final path is GET /api/orders.
  const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf-8')
  assert.match(serverSrc, /app\.use\s*\(\s*['"]\/api\/orders['"]/, "must be mounted at '/api/orders'")
  assert.doesNotMatch(serverSrc, /app\.use.*\/api\/admin\/orders/, "must NOT be mounted at '/api/admin/orders'")
})

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────

test('authMiddleware is applied on GET /', () => {
  assert.match(src, /router\.get\s*\(\s*['"]\/['"],\s*authMiddleware/, 'GET / must use authMiddleware')
})

test('authMiddleware is applied on POST /:id/send-link', () => {
  assert.match(src, /router\.post\s*\(\s*['"]\/.*send-link['"],\s*authMiddleware/, 'send-link must use authMiddleware')
})

test('POST /create has NO auth (public endpoint)', () => {
  const createSection = src.slice(src.indexOf("'/create'"), src.indexOf("router.get"))
  assert.doesNotMatch(createSection, /authMiddleware/, 'POST /create must be public')
})

test('authMiddleware reads token from Authorization header', () => {
  assert.match(src, /authorization.*split.*' '/, 'must split Authorization header')
  assert.match(src, /jwt\.verify\s*\(/, 'must call jwt.verify')
  assert.match(src, /process\.env\.JWT_SECRET/, 'must use JWT_SECRET env var')
})

// ─── DATA MAPPING: customers INSERT ───────────────────────────

test('POST /create maps customer.fullName → full_name', () => {
  assert.match(src, /full_name\s*:\s*customer\.fullName/, 'full_name must come from customer.fullName')
})

test('POST /create maps customer.phone → phone (not telegram)', () => {
  assert.match(src, /phone\s*:\s*customer\.phone/, 'phone must come from customer.phone')
  // Make sure phone is NOT getting telegram value
  const insertBlock = src.slice(src.indexOf("'/create'"), src.indexOf("router.get"))
  assert.doesNotMatch(insertBlock, /phone\s*:.*telegram/, 'phone must not contain telegram value')
})

test('POST /create maps customer.telegram → telegram column', () => {
  assert.match(src, /telegram\s*:\s*customer\.telegram/, 'telegram must come from customer.telegram')
})

test('POST /create sets status to "wait" by default', () => {
  const insertBlock = src.slice(src.indexOf("'/create'"), src.indexOf("router.get"))
  assert.match(insertBlock, /status\s*:\s*['"]wait['"]/, 'status must be "wait" on create')
})

test('POST /create sets link_sent to false', () => {
  const insertBlock = src.slice(src.indexOf("'/create'"), src.indexOf("router.get"))
  assert.match(insertBlock, /link_sent\s*:\s*false/, 'link_sent must be false on create')
})

// ─── GET / RESPONSE FORMAT ─────────────────────────────────────

test('GET / returns data array (res.json(data || []))', () => {
  assert.match(src, /res\.json\(data \|\| \[\]\)/, 'must return data || []')
})

test('GET / returns [] when supabase is not configured', () => {
  assert.match(src, /if\s*\(!supabase\)\s*return res\.json\(\[\]\)/, 'must short-circuit with [] when no supabase')
})

// ─── SEND-LINK FLOW ───────────────────────────────────────────

test('send-link updates link_sent=true and status="send" after success', () => {
  const sendSection = src.slice(src.indexOf("'/:id/send-link'"))
  assert.match(sendSection, /link_sent\s*:\s*true/, 'must set link_sent=true')
  assert.match(sendSection, /status\s*:\s*['"]send['"]/, 'must set status="send"')
})

test('send-link calls Supabase Edge Function send-payment-link', () => {
  assert.match(src, /functions\/v1\/send-payment-link/, 'must call Edge Function URL')
})

test('send-link uses x-worker-secret header for Edge Function auth', () => {
  assert.match(src, /x-worker-secret/, 'must send x-worker-secret header')
})
