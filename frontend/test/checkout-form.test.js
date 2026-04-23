// Structural tests for the new cart checkout flow
// Run: node --test test/checkout-form.test.js

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const layoutSrc = fs.readFileSync(path.join(__dirname, '..', 'layouts', 'default.vue'), 'utf-8')

test('Cart contact section has email and telegram fields', () => {
  assert.match(layoutSrc, /cartForm\.email/, 'must have cartForm.email')
  assert.match(layoutSrc, /cartForm\.telegram/, 'must have cartForm.telegram')
})

test('Both email and telegram are required (no contactType toggle)', () => {
  assert.match(layoutSrc, /Email \*/, 'email must be marked required')
  assert.match(layoutSrc, /Telegram username \*/, 'telegram must be marked required')
  assert.doesNotMatch(layoutSrc, /contactType/, 'should not have single contactType toggle')
})

test('Cart total shows delivery cost warning', () => {
  assert.match(layoutSrc, /delivery-note/, 'must have delivery-note element')
  assert.match(layoutSrc, /зависимости от стоимости доставки/, 'must have delivery warning text')
})

test('Step 1 proceed button says К ОФОРМЛЕНИЮ', () => {
  assert.match(layoutSrc, /К ОФОРМЛЕНИЮ/, 'proceed button must say К ОФОРМЛЕНИЮ')
  assert.doesNotMatch(layoutSrc, /К оплате/, 'must not say К оплате')
})

test('Step 2 is labeled Оформление not Оплата', () => {
  assert.match(layoutSrc, /<span>Оформление<\/span>/, 'step 2 must be labeled Оформление')
})

test('Final button says Оформить заказ not Оплатить', () => {
  assert.match(layoutSrc, /Оформить заказ/, 'final button must say Оформить заказ')
  assert.doesNotMatch(layoutSrc, /Оплатить/, 'must not say Оплатить')
})

test('After order creation navigates directly to success page (no API call)', () => {
  assert.match(layoutSrc, /navigateTo\(['"]\/payment\/success['"]\)/, 'must navigate to /payment/success')
  assert.doesNotMatch(layoutSrc, /\/api\/payment\/create/, 'must not call payment API')
  assert.doesNotMatch(layoutSrc, /cartPaymentLoading/, 'must not have payment loading state')
  assert.doesNotMatch(layoutSrc, /cartPaymentError/, 'must not have payment error state')
})

test('Delivery options include CDEK, Yandex, Pochta', () => {
  assert.match(layoutSrc, /['"]cdek['"]/,   'should have cdek option')
  assert.match(layoutSrc, /['"]yandex['"]/, 'should have yandex option')
  assert.match(layoutSrc, /['"]pochta['"]/, 'should have pochta option')
})

test('CDEK section has city, postal code and address fields', () => {
  assert.match(layoutSrc, /cdekPostalCode/, 'should have cdekPostalCode field')
  assert.match(layoutSrc, /cdekAddress/,    'should have cdekAddress field')
  assert.match(layoutSrc, /cartForm\.city/, 'should have city field')
})

test('CDEK map widget is shown for cdek method', () => {
  assert.match(
    layoutSrc,
    /deliveryMethod\s*===\s*['"]cdek['"]/,
    'should branch on cdek method for the map'
  )
})

test('Yandex delivery has its own address fields', () => {
  assert.match(layoutSrc, /deliveryMethod\s*===\s*['"]yandex['"]/, 'should branch on yandex')
  assert.match(layoutSrc, /yandexAddress/, 'should have yandexAddress')
  assert.match(layoutSrc, /yandexRecipient/, 'should have yandexRecipient')
})

test('Pochta has postal code + address fields', () => {
  assert.match(layoutSrc, /deliveryMethod\s*===\s*['"]pochta['"]/, 'should branch on pochta')
  assert.match(layoutSrc, /pochtaPostalCode/, 'should have pochtaPostalCode')
  assert.match(layoutSrc, /pochtaAddress/,    'should have pochtaAddress')
})

test('Step order: contact section before delivery section', () => {
  const contactIdx  = layoutSrc.search(/Контактные\s+данные/i)
  const deliveryIdx = layoutSrc.indexOf('Способ доставки')
  assert.ok(contactIdx  !== -1, 'contact section header must exist')
  assert.ok(deliveryIdx !== -1, 'delivery section header must exist')
  assert.ok(contactIdx < deliveryIdx, 'contact must come before delivery')
})
