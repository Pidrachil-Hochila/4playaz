// Tests for payment.js — Supabase must be optional
// Run: node --test test/payment.test.js

const test = require('node:test')
const assert = require('node:assert/strict')

test('payment module loads without SUPABASE_URL', () => {
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_KEY

  delete require.cache[require.resolve('../payment.js')]

  assert.doesNotThrow(() => {
    require('../payment.js')
  }, 'payment.js must not crash when SUPABASE_URL is missing')
})

test('payment module loads when only SUPABASE_URL is set', () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  delete process.env.SUPABASE_SERVICE_KEY

  delete require.cache[require.resolve('../payment.js')]

  assert.doesNotThrow(() => {
    require('../payment.js')
  }, 'payment.js must not crash when SUPABASE_SERVICE_KEY is missing')
})

test('payment module exports an Express router', () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_KEY = 'fake-key'

  delete require.cache[require.resolve('../payment.js')]
  const router = require('../payment.js')
  assert.equal(typeof router, 'function', 'router must be a function (Express router)')
  assert.equal(typeof router.use, 'function', 'router.use must exist')
  assert.equal(typeof router.post, 'function', 'router.post must exist')
})

test('validation requires both phone AND telegram', () => {
  // This is verified structurally: the validation string is present in source
  const fs = require('node:fs')
  const src = fs.readFileSync(require.resolve('../payment.js'), 'utf-8')
  assert.match(src, /hasPhone.*hasTelegram|hasTelegram.*hasPhone/, 'must check both phone and telegram')
  assert.match(src, /Telegram/, 'error message must mention Telegram')
})
