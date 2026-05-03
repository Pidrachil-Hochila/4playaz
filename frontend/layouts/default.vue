<template>
  <div class="site-wrapper">
    <!-- ANNOUNCEMENT BAR -->
    <div class="announcement">
      <div class="announcement-inner">
        <span>DONT TEST MY PIMPIN.</span>
        <span class="dot">✦</span>
        <span>DONT TEST MY PIMPIN.</span>
        <span class="dot">✦</span>
        <span>DONT TEST MY PIMPIN.</span>
        <span class="dot">✦</span>
        <span>DONT TEST MY PIMPIN.</span>
        <span class="dot">✦</span>
      </div>
    </div>

    <!-- HEADER -->
    <header>
      <div class="header-inner">
        <nav class="nav-left">
          <a href="https://t.me/playaz_store" target="_blank" class="nav-link">Тг канал</a>
        </nav>
        <NuxtLink to="/" class="logo">4PLAYAZ</NuxtLink>
        <div class="nav-right">
          <a href="https://t.me/otzivi_4playaz" target="_blank" class="nav-link">Отзывы</a>
          <NuxtLink to="/zamer" class="nav-link">Замеры</NuxtLink>
          <button class="cart-btn" @click="openCart" aria-label="Корзина">
            <svg class="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <span class="cart-count" v-if="totalItems > 0">{{ totalItems }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- ═══ CART DRAWER ═══════════════════════════════════════ -->
    <Teleport to="body">
      <div class="cart-overlay" :class="{ open: cartOpen }" @click.self="closeCart">
        <div class="cart-drawer">

          <!-- HEADER -->
          <div class="cart-drawer-header">
            <div class="cart-header-left">
              <h2 class="cart-drawer-title">КОРЗИНА</h2>
              <span class="cart-items-count" v-if="totalItems > 0">{{ totalItems }} {{ totalItems === 1 ? 'товар' : totalItems < 5 ? 'товара' : 'товаров' }}</span>
            </div>
            <button class="cart-close" @click="closeCart">✕</button>
          </div>


          <!-- EMPTY STATE -->
          <div v-if="cartItems.length === 0 && !checkoutMode" class="cart-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="cart-empty-icon">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <p class="cart-empty-title">Корзина пуста</p>
            <p class="cart-empty-sub">Добавьте товары для оформления заказа</p>
            <button class="btn-primary" @click="closeCart">Перейти в магазин</button>
          </div>

          <!-- CART ITEMS + FOOTER -->
          <div v-else-if="!checkoutMode" class="cart-content">
            <div class="cart-items">
              <div v-for="item in cartItems" :key="item.cartKey" class="cart-item">
                <div class="cart-item-img">
                  <img v-if="item.image" :src="resolveImg(item.image)" :alt="item.name">
                  <div v-else class="cart-item-img-placeholder">4PZ</div>
                </div>
                <div class="cart-item-info">
                  <div class="cart-item-category">{{ item.category }}</div>
                  <div class="cart-item-name">{{ item.name }}</div>
                  <div v-if="item.size" class="cart-item-size">{{ item.size }}</div>
                  <div class="cart-item-price-row">
                    <div class="cart-item-qty">
                      <button class="qty-btn" @click="updateQuantity(item.cartKey, item.quantity - 1)">−</button>
                      <span class="qty-value">{{ item.quantity }}</span>
                      <button class="qty-btn" @click="updateQuantity(item.cartKey, item.quantity + 1)">+</button>
                    </div>
                    <div class="cart-item-price">{{ formatPrice(item.price * item.quantity) }}</div>
                  </div>
                </div>
                <button class="cart-item-remove" @click="removeFromCart(item.cartKey)" title="Удалить">
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12">
                    <path d="M1 1l12 12M13 1L1 13"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- PRICE SUMMARY -->
            <div class="cart-price-summary">
              <div class="price-row total-row">
                <span class="price-label-total">ИТОГО</span>
                <span class="price-value-total">{{ formatPrice(totalPrice) }}</span>
              </div>
              <p class="delivery-note">* Итоговая сумма может измениться в зависимости от стоимости доставки</p>
            </div>

            <div class="cart-footer">
              <button class="btn-checkout-main" @click="goToCheckout">
                Оформить заказ →
              </button>
              <button class="cart-clear" @click="clearCart">Очистить корзину</button>
            </div>
          </div>

          <!-- ═══ CHECKOUT INSIDE CART ═══ -->
          <div v-if="checkoutMode" class="cart-checkout">

            <!-- STEP INDICATOR -->
            <div class="checkout-steps">
              <div class="checkout-step" :class="{ active: cartCheckoutStep === 1, done: cartCheckoutStep > 1 }">
                <div class="step-dot">{{ cartCheckoutStep > 1 ? '✓' : '1' }}</div>
                <span>Данные</span>
              </div>
              <div class="step-line" :class="{ done: cartCheckoutStep > 1 }"></div>
              <div class="checkout-step" :class="{ active: cartCheckoutStep === 2 }">
                <div class="step-dot">2</div>
                <span>Оформление</span>
              </div>
            </div>

            <!-- STEP 1 -->
            <div v-if="cartCheckoutStep === 1" class="cart-checkout-body">

              <!-- ─── 1. КОНТАКТНЫЕ ДАННЫЕ ─── -->
              <div class="form-section">
                <h4 class="form-section-title">Контактные данные</h4>
                <div class="form-group">
                  <label class="form-label">👤 ФИО *</label>
                  <input
                    v-model="cartForm.fullName"
                    type="text"
                    class="form-input"
                    :class="{ error: cartErrors.fullName }"
                    placeholder="Иванов Иван Иванович"
                  >
                  <span v-if="cartErrors.fullName" class="form-error">{{ cartErrors.fullName }}</span>
                </div>
                <div class="form-group">
                  <label class="form-label">📞 Номер телефона *</label>
                  <input
                    v-model="cartForm.phone"
                    type="tel"
                    class="form-input"
                    :class="{ error: cartErrors.phone }"
                    placeholder="+7 900 000 00 00"
                  >
                  <span v-if="cartErrors.phone" class="form-error">{{ cartErrors.phone }}</span>
                </div>
                <div class="form-group">
                  <label class="form-label">📧 Email *</label>
                  <input
                    v-model="cartForm.email"
                    type="email"
                    class="form-input"
                    :class="{ error: cartErrors.email }"
                    placeholder="ivan@mail.ru"
                  >
                  <span v-if="cartErrors.email" class="form-error">{{ cartErrors.email }}</span>
                </div>
                <div class="form-group">
                  <label class="form-label">✈️ Telegram username *</label>
                  <input
                    v-model="cartForm.telegram"
                    type="text"
                    class="form-input"
                    :class="{ error: cartErrors.telegram }"
                    placeholder="@username"
                  >
                  <span v-if="cartErrors.telegram" class="form-error">{{ cartErrors.telegram }}</span>
                </div>
              </div>

              <!-- ─── 2. СПОСОБ ДОСТАВКИ ─── -->
              <div class="form-section">
                <h4 class="form-section-title">Способ доставки</h4>
                <div class="delivery-options">
                  <label v-for="opt in deliveryOptions" :key="opt.value" class="delivery-option" :class="{ active: cartForm.deliveryMethod === opt.value }">
                    <input type="radio" v-model="cartForm.deliveryMethod" :value="opt.value" class="delivery-radio" @change="onDeliveryMethodChange">
                    <div class="delivery-option-icon">{{ opt.icon }}</div>
                    <div class="delivery-option-content">
                      <div class="delivery-option-name">{{ opt.name }}</div>
                      <div class="delivery-option-desc">{{ opt.desc }}</div>
                    </div>
                    <div class="delivery-option-days">{{ opt.days }}</div>
                  </label>
                </div>
                <span v-if="cartErrors.deliveryMethod" class="form-error">{{ cartErrors.deliveryMethod }}</span>
              </div>

              <!-- ─── 3a. СДЭК ─── -->
              <!-- ─── 3a. СДЭК ─── -->
              <div class="form-section" v-if="cartForm.deliveryMethod === 'cdek'">
                <h4 class="form-section-title">Данные для доставки СДЭК</h4>

                <div class="form-row-2">
                  <div class="form-group">
                    <label class="form-label">Город *</label>
                    <input
                      v-model="cartForm.city"
                      type="text"
                      class="form-input"
                      :class="{ error: cartErrors.city }"
                      placeholder="Москва"
                      @input="onCityInput"
                    >
                    <span v-if="cartErrors.city" class="form-error">{{ cartErrors.city }}</span>
                  </div>
                  <div class="form-group">
                 </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Адрес пункта выдачи (ПВЗ) *</label>
                  <p class="pvz-hint">⚠ Укажите адрес пункта выдачи СДЭК, не домашний адрес</p>
                  <input
                    v-model="cartForm.cdekAddress"
                    type="text"
                    class="form-input"
                    :class="{ error: cartErrors.cdekAddress }"
                    placeholder="ул. Ленина, д. 5 (ПВЗ СДЭК)"
                  >
                  <span v-if="cartErrors.cdekAddress" class="form-error">{{ cartErrors.cdekAddress }}</span>
                </div>

              </div>

              <!-- ─── 3b. ЯНДЕКС ДОСТАВКА ─── -->
              <div class="form-section" v-if="cartForm.deliveryMethod === 'yandex'">
                <h4 class="form-section-title">Адрес доставки (Яндекс)</h4>
                <div class="form-group">
                  <label class="form-label">ФИО получателя *</label>
                  <input v-model="cartForm.yandexRecipient" type="text" class="form-input" :class="{ error: cartErrors.yandexRecipient }" placeholder="Иванов Иван Иванович">
                  <span v-if="cartErrors.yandexRecipient" class="form-error">{{ cartErrors.yandexRecipient }}</span>
                </div>
                <div class="form-group">
                  <label class="form-label">Город *</label>
                  <input v-model="cartForm.yandexCity" type="text" class="form-input" :class="{ error: cartErrors.yandexCity }" placeholder="Москва">
                  <span v-if="cartErrors.yandexCity" class="form-error">{{ cartErrors.yandexCity }}</span>
                </div>
                <div class="form-group">
                  <label class="form-label">Адрес пункта выдачи (ПВЗ) *</label>
                  <p class="pvz-hint">⚠ Укажите адрес пункта выдачи, не домашний адрес</p>
                  <input v-model="cartForm.yandexAddress" type="text" class="form-input" :class="{ error: cartErrors.yandexAddress }" placeholder="ул. Ленина, д. 5 (ПВЗ)">
                  <span v-if="cartErrors.yandexAddress" class="form-error">{{ cartErrors.yandexAddress }}</span>
                </div>
              </div>

              <!-- ─── 3c. ПОЧТА РОССИИ ─── -->
              <div class="form-section" v-if="cartForm.deliveryMethod === 'pochta'">
                <h4 class="form-section-title">Адрес доставки (Почта России)</h4>
                <div class="form-group">
                  <label class="form-label">ФИО получателя *</label>
                  <input v-model="cartForm.pochtaRecipient" type="text" class="form-input" :class="{ error: cartErrors.pochtaRecipient }" placeholder="Иванов Иван Иванович">
                  <span v-if="cartErrors.pochtaRecipient" class="form-error">{{ cartErrors.pochtaRecipient }}</span>
                </div>
                <div class="form-row-2">
                  <div class="form-group">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Город *</label>
                    <input v-model="cartForm.pochtaCity" type="text" class="form-input" :class="{ error: cartErrors.pochtaCity }" placeholder="Москва">
                    <span v-if="cartErrors.pochtaCity" class="form-error">{{ cartErrors.pochtaCity }}</span>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Адрес пункта выдачи (ПВЗ) *</label>
                  <p class="pvz-hint">⚠ Укажите адрес отделения Почты России, не домашний адрес</p>
                  <input v-model="cartForm.pochtaAddress" type="text" class="form-input" :class="{ error: cartErrors.pochtaAddress }" placeholder="ул. Ленина, д. 5 (Почта России)">
                  <span v-if="cartErrors.pochtaAddress" class="form-error">{{ cartErrors.pochtaAddress }}</span>
                </div>
              </div>

              <!-- ОФЕРТА -->
              <div class="oferta-section">
                <label class="oferta-label" :class="{ error: cartErrors.oferta }">
                  <input type="checkbox" v-model="cartForm.ofertaAccepted" class="oferta-checkbox">
                  <span class="oferta-text">
                    Принимаю условия
                    <a href="/oferta" target="_blank" class="form-link">договора оферты</a>
                    и согласие на обработку персональных данных
                  </span>
                </label>
                <span v-if="cartErrors.oferta" class="form-error">{{ cartErrors.oferta }}</span>
              </div>

              <div class="checkout-nav">
                <button class="btn-back-sm" @click="checkoutMode = false">← В корзину</button>
                <button class="btn-proceed" :disabled="!cartForm.ofertaAccepted" @click="cartProceedStep2">
                  К ОФОРМЛЕНИЮ →
                </button>
              </div>
            </div>

            <!-- STEP 2: ОПЛАТА -->
            <div v-if="cartCheckoutStep === 2" class="cart-checkout-body">
              <div class="order-review">
                <h4 class="form-section-title">Ваш заказ</h4>
                <div class="order-items-list">
                  <div class="order-item-row" v-for="item in cartItems" :key="item.cartKey">
                    <div class="order-item-img">
                      <img v-if="item.image" :src="resolveImg(item.image)" :alt="item.name">
                      <div v-else class="order-item-img-ph">4PZ</div>
                    </div>
                    <div class="order-item-details">
                      <div class="order-item-name">{{ item.name }}</div>
                      <div v-if="item.size" class="order-item-size">Размер: {{ item.size }}</div>
                      <div class="order-item-qty">× {{ item.quantity }}</div>
                    </div>
                    <div class="order-item-price">{{ formatPrice(item.price * item.quantity) }}</div>
                  </div>
                </div>

                <div class="order-summary-table">
                  <div class="summary-line">
                    <span>Товары ({{ totalItems }} шт.)</span>
                    <span>{{ formatPrice(subtotalPrice) }}</span>
                  </div>
                  <div class="summary-line">
                    <span>ФИО</span>
                    <span>{{ cartForm.fullName }}</span>
                  </div>
                  <div class="summary-line">
                    <span>Телефон</span>
                    <span>{{ cartForm.phone }}</span>
                  </div>
                  <div class="summary-line">
                    <span>Email</span>
                    <span>{{ cartForm.email }}</span>
                  </div>
                  <div class="summary-line">
                    <span>Telegram</span>
                    <span>{{ cartForm.telegram }}</span>
                  </div>
                  <div class="summary-line">
                    <span>Адрес</span>
                    <span>{{ fullDeliveryAddress }}</span>
                  </div>
                  <div class="summary-divider"></div>
                  <div class="summary-line summary-total">
                    <span>ИТОГО</span>
                    <span>{{ formatPrice(totalPrice) }}</span>
                  </div>
                </div>
              </div>

              <div class="payment-note">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 4v4m0 4h.01"/></svg>
                <p>После оформления заказа ссылка на оплату придёт вам на почту. Проверяйте папку «Входящие» и «Спам».</p>
              </div>

              <div v-if="cartSubmitError" class="submit-error">{{ cartSubmitError }}</div>
              <div class="checkout-nav">
                <button class="btn-back-sm" @click="cartCheckoutStep = 1" :disabled="cartSubmitting">← Назад</button>
                <button class="btn-pay" @click="cartCreatePayment" :disabled="cartSubmitting">
                  {{ cartSubmitting ? 'Оформление...' : 'Оформить заказ →' }}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Teleport>

    <!-- PAGE CONTENT -->
    <main>
      <slot />
    </main>

    <!-- FOOTER -->
    <footer>
      <div class="footer-grid">
        <div class="footer-brand">
          <h3 class="footer-logo">4PLAYAZ</h3>
          <p>Уличная одежда для избранных. Коллабы DJ XBOX360 и 3.5 PROPOVEDNIK.</p>
        </div>
        <div class="footer-col">
          <h4>Навигация</h4>
          <ul>
            <li><NuxtLink to="/">Главная</NuxtLink></li>
            <li><a href="/?type=hoodie">Худи</a></li>
            <li><a href="/?type=tshirt">Футболки</a></li>
            <li><a href="/?type=longsleeve">Лонгсливы</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Контакты</h4>
          <ul>
            <li><a href="https://t.me/playaz_store" target="_blank">Telegram Shop</a></li>
            <li><a href="https://t.me/otzivi_4playaz" target="_blank">Отзывы</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span class="footer-tagline">DONT TEST MY PIMPIN.</span>
      </div>
    </footer>

    <!-- TOAST -->
    <Teleport to="body">
      <div class="toast" :class="{ show: toastVisible }">{{ toastMsg }}</div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, nextTick } from 'vue'
import { useCart } from '~/composables/useCart'
import { useApi } from '~/composables/useApi'

const {
  cartItems, cartOpen, totalItems,
  subtotalPrice, shippingPrice, totalPrice,
  freeShipping, amountToFreeShipping,
  addToCart, removeFromCart, updateQuantity,
  clearCart, openCart, closeCart
} = useCart()

const toastVisible = ref(false)
const toastMsg = ref('')

const showToast = (msg: string) => {
  toastMsg.value = msg
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, 2800)
}

provide('showToast', showToast)
provide('addToCart', (product: any) => {
  addToCart(product)
  showToast(`${product.name} добавлен в корзину`)
})

const config = useRuntimeConfig()
const API_BASE = config.public.apiBase
const { createOrder } = useApi()
const resolveImg = (src: string): string => {
  if (!src) return ''
  if (src.startsWith('data:') || src.startsWith('http')) return src
  if (API_BASE) return `${API_BASE}${src}`
  const appBase = (config.app?.baseURL as string || '/').replace(/\/$/, '')
  return `${appBase}${src}`
}
const formatPrice = (price: number) => price.toLocaleString('ru') + ' ₽'

// ─── CHECKOUT STATE ────────────────────────────────────────
const checkoutMode = ref(false)
const cartCheckoutStep = ref(1)

const cartForm = ref({
  // 1. Контакты
  fullName: '',
  phone: '',
  email: '',
  telegram: '',
  // 2. Способ доставки
  deliveryMethod: '' as '' | 'cdek' | 'yandex' | 'pochta',
  // 3a. СДЭК
  city: '',
  pickupAddress: '',
  pvzCode: '',
  cdekAddress: '',
  cdekPostalCode: '',
  // 3b. Яндекс Доставка
  yandexCity: '',
  yandexAddress: '',
  yandexRecipient: '',
  // 3c. Почта России
  pochtaPostalCode: '',
  pochtaCity: '',
  pochtaAddress: '',
  pochtaRecipient: '',
  // оферта
  ofertaAccepted: false
})

const cartErrors = ref<Record<string, string>>({})

const deliveryOptions = [
  { value: 'cdek',   name: 'СДЭК',           desc: 'Пункт выдачи',  days: '2–5 дн',  icon: '📫' },
  { value: 'yandex', name: 'Яндекс Доставка', desc: 'Пункт выдачи',        days: '1–3 дн',  icon: '🚚' },
  { value: 'pochta', name: 'Почта России',    desc: 'Пункт выдачи',    days: '5–14 дн', icon: '✉️' },
]

// ─── CDEK WIDGET (inline) ──────────────────────────────────
const CDEK_YANDEX_API_KEY = config.public.yandexApiKey as string
const CDEK_SERVICE_PATH = config.public.cdekServicePath as string

let cdekWidgetInstance: any = null

const initCdekWidget = (city?: string) => {
  if (typeof window === 'undefined' || !(window as any).CDEKWidget) return

  console.log('[CDEK] apiKey:', CDEK_YANDEX_API_KEY)
  console.log('[CDEK] servicePath:', CDEK_SERVICE_PATH)

  if (!CDEK_YANDEX_API_KEY) {
    console.error('[CDEK] Яндекс API ключ не задан! Проверь NUXT_PUBLIC_YANDEX_API_KEY в .env')
    return
  }

  // Уничтожаем старый экземпляр если есть
  if (cdekWidgetInstance) {
    try { cdekWidgetInstance.destroy?.() } catch {}
    cdekWidgetInstance = null
    const el = document.getElementById('cdek-map')
    if (el) el.innerHTML = ''
  }

  cdekWidgetInstance = new (window as any).CDEKWidget({
    root: 'cdek-map',
    apiKey: CDEK_YANDEX_API_KEY,
    servicePath: CDEK_SERVICE_PATH,
    canChoose: true,
    popup: false,
    lang: 'rus',
    currency: 'RUB',
    defaultLocation: city || cartForm.value.city || 'Москва',
    hideDeliveryOptions: { door: true },
    onReady() {},
    onChoose(_delivery: string, _rate: any, address: any) {
      cartForm.value.city = address.city || cartForm.value.city
      cartForm.value.pickupAddress = address.address || address.name || ''
      cartForm.value.pvzCode = address.code || ''
      cartErrors.value.address = ''
      cartErrors.value.city = ''
    },
  })
}

// Инициализируем виджет только если выбран СДЭК
const onDeliveryMethodChange = () => {
  if (cartForm.value.deliveryMethod === 'cdek') {
    nextTick(() => { initCdekWidget() })
  }
}

// Перезапускаем виджет с новым городом после паузы при вводе
let cityInputTimer: ReturnType<typeof setTimeout> | null = null
const onCityInput = () => {
  if (cityInputTimer) clearTimeout(cityInputTimer)
  cityInputTimer = setTimeout(() => {
    if (cartForm.value.city.trim().length >= 2) {
      initCdekWidget(cartForm.value.city.trim())
    }
  }, 800)
}

const resetMapSearch = () => {}
const onAddressSearch = () => {}
const selectAddress = (addr: string) => { cartForm.value.pickupAddress = addr }

// ─── COMPUTED FULL ADDRESS ─────────────────────────────────
const fullDeliveryAddress = computed(() => {
  const f = cartForm.value
  if (f.deliveryMethod === 'cdek') {
    return [f.cdekPostalCode, f.city, f.cdekAddress, f.pickupAddress].filter(Boolean).join(', ')
  }
  if (f.deliveryMethod === 'yandex') {
    return [f.yandexCity, f.yandexAddress].filter(Boolean).join(', ')
  }
  if (f.deliveryMethod === 'pochta') {
    return [f.pochtaPostalCode, f.pochtaCity, f.pochtaAddress].filter(Boolean).join(', ')
  }
  return ''
})

const recipientName = computed(() => {
  const f = cartForm.value
  if (f.deliveryMethod === 'yandex') return f.yandexRecipient
  if (f.deliveryMethod === 'pochta') return f.pochtaRecipient
  return ''
})

// ─── VALIDATION ────────────────────────────────────────────
const cartValidateStep1 = () => {
  const e: Record<string, string> = {}
  const f = cartForm.value

  // 1. ФИО
  if (!f.fullName.trim()) e.fullName = 'Введите ФИО'

  // 1. Телефон
  if (!f.phone.trim()) e.phone = 'Введите номер телефона'
  else if (!/^[\d\s+\-()]{7,20}$/.test(f.phone.trim())) e.phone = 'Неверный формат номера'

  // 1. Email (обязателен)
  if (!f.email.trim()) e.email = 'Введите email'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Неверный формат email'

  // 1. Telegram (обязателен)
  if (!f.telegram.trim()) e.telegram = 'Введите Telegram username'
  else if (!/^@?[A-Za-z0-9_]{4,}$/.test(f.telegram.trim())) e.telegram = 'Неверный Telegram username'

  // 2. Способ доставки
  if (!f.deliveryMethod) e.deliveryMethod = 'Выберите способ доставки'

  // 3. Поля под выбранный способ
  if (f.deliveryMethod === 'cdek') {
    if (!f.city.trim())          e.city = 'Введите город'
    if (!f.cdekAddress.trim())   e.cdekAddress = 'Введите улицу и дом'
  } else if (f.deliveryMethod === 'yandex') {
    if (!f.yandexRecipient.trim()) e.yandexRecipient = 'Введите ФИО получателя'
    if (!f.yandexCity.trim())      e.yandexCity = 'Введите город'
    if (!f.yandexAddress.trim())   e.yandexAddress = 'Введите адрес'
  } else if (f.deliveryMethod === 'pochta') {
    if (!f.pochtaRecipient.trim())                  e.pochtaRecipient = 'Введите ФИО получателя'
    if (!f.pochtaCity.trim())                       e.pochtaCity = 'Введите город'
    if (!f.pochtaAddress.trim())                    e.pochtaAddress = 'Введите адрес'
  }

  if (!f.ofertaAccepted) e.oferta = 'Необходимо принять условия оферты'

  cartErrors.value = e
  return Object.keys(e).length === 0
}

const goToCheckout = () => {
  checkoutMode.value = true
  cartCheckoutStep.value = 1
  cartErrors.value = {}
}

const cartProceedStep2 = () => {
  if (cartValidateStep1()) cartCheckoutStep.value = 2
}

// ─── ОФОРМЛЕНИЕ ЗАКАЗА ─────────────────────────────────────
const cartSubmitting = ref(false)
const cartSubmitError = ref('')

const cartCreatePayment = async () => {
  const f = cartForm.value
  const tg = f.telegram.trim()

  cartSubmitting.value = true
  cartSubmitError.value = ''
  try {
    await createOrder({
      productName: cartItems.value.map(i => `${i.name} ×${i.quantity}`).join(', '),
      productSize: cartItems.value
        .filter(i => i.size)
        .map(i => `${i.size} ×${i.quantity}`)
        .join(', ') || undefined,
      amount: totalPrice.value,
      customer: {
        fullName: f.fullName.trim(),
        phone:    f.phone.trim(),
        telegram: tg.startsWith('@') ? tg : `@${tg}`,
        email:    f.email.trim(),
      },
      delivery: {
        method:        f.deliveryMethod,
        address:       fullDeliveryAddress.value,
        deliveryPrice: 0,
      },
    })
    clearCart()
    closeCart()
    checkoutMode.value = false
    cartCheckoutStep.value = 1
    document.body.style.overflow = ''
    navigateTo('/payment/success')
  } catch (err: any) {
    cartSubmitError.value = err?.data?.message || err?.message || 'Ошибка при оформлении заказа'
  } finally {
    cartSubmitting.value = false
  }
}
</script>

<style scoped>
/* ─── ANNOUNCEMENT ─── */
.announcement {
  background: var(--red-deep);
  color: var(--white);
  text-align: center;
  padding: 8px 0;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  overflow: hidden;
  border-bottom: 1px solid var(--red);
}
.announcement-inner {
  display: inline-block;
  animation: marquee 18s linear infinite;
  white-space: nowrap;
}
.announcement-inner span { margin: 0 24px; }
.announcement-inner .dot { color: var(--red-bright); font-size: 8px; }
@keyframes marquee {
  from { transform: translateX(100vw); }
  to   { transform: translateX(-100%); }
}

/* ─── HEADER ─── */
header {
  position: sticky; top: 0; z-index: 100;
  background: rgba(10, 10, 10, 0.97);
  border-bottom: 1px solid var(--border-red);
  backdrop-filter: blur(10px);
}
.header-inner {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 40px;
  height: 60px;
}
.nav-left { display: flex; gap: 32px; }
.nav-left a, .nav-right .nav-link {
  font-family: var(--font-cinzel);
  font-size: 9.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--light);
  transition: color 0.2s;
  padding: 4px 0;
  border-bottom: 1px solid transparent;
}
.nav-left a:hover, .nav-right .nav-link:hover { color: var(--red-bright); border-bottom-color: var(--red-bright); }
.logo {
  text-align: center;
  font-family: var(--font-gothic);
  font-size: 28px;
  letter-spacing: 0.1em;
  color: var(--white);
  text-decoration: none;
  text-shadow: 0 0 30px var(--red-glow);
  transition: text-shadow 0.3s;
}
.logo:hover { text-shadow: 0 0 40px var(--red), 0 0 80px var(--red-glow); }
.nav-right { display: flex; justify-content: flex-end; align-items: center; gap: 24px; }

/* ─── CART BUTTON ─── */
.cart-btn {
  position: relative; background: none; border: 1px solid var(--border-red);
  color: var(--light); cursor: pointer; width: 38px; height: 38px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; flex-shrink: 0;
}
.cart-btn:hover { background: var(--red-deep); color: var(--white); border-color: var(--red); }
.cart-icon { width: 18px; height: 18px; }
.cart-count {
  position: absolute; top: -8px; right: -8px;
  background: var(--red-bright); color: var(--white);
  font-family: var(--font-cinzel); font-size: 9px; font-weight: 700;
  min-width: 18px; height: 18px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 4px; line-height: 1;
}

/* ─── CART OVERLAY / DRAWER ─── */
.cart-overlay {
  position: fixed; inset: 0; z-index: 400;
  background: rgba(0,0,0,0.8); backdrop-filter: blur(6px);
  display: none;
}
.cart-overlay.open { display: block; }
.cart-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 100%; max-width: 560px;
  background: var(--deep);
  border-left: 1px solid var(--border-red);
  display: flex; flex-direction: column;
  overflow-y: auto;
  animation: slideInRight 0.35s cubic-bezier(0.22, 0.61, 0.36, 1);
}
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* DRAWER HEADER */
.cart-drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 28px 32px 22px;
  border-bottom: 1px solid var(--border-red);
  position: sticky; top: 0;
  background: var(--deep); z-index: 5;
  flex-shrink: 0;
}
.cart-header-left { display: flex; align-items: baseline; gap: 14px; }
.cart-drawer-title {
  font-family: var(--font-gothic); font-size: 22px;
  letter-spacing: 0.12em; color: var(--white); text-transform: uppercase;
  text-shadow: 0 0 20px var(--red-glow);
}
.cart-items-count {
  font-family: var(--font-cinzel); font-size: 9px;
  letter-spacing: 0.2em; text-transform: uppercase; color: var(--mid);
}
.cart-close {
  background: none; border: 1px solid var(--border);
  color: var(--mid); width: 34px; height: 34px; cursor: pointer; font-size: 12px;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s;
}
.cart-close:hover { border-color: var(--red); color: var(--white); background: var(--red-deep); }

/* FREE SHIPPING PROGRESS */
.shipping-progress {
  padding: 12px 32px;
  background: rgba(192,57,43,0.04);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.shipping-progress.free { background: rgba(39,174,96,0.06); border-bottom-color: rgba(39,174,96,0.2); }
.shipping-progress-text {
  display: flex; justify-content: space-between;
  font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--mid); margin-bottom: 8px;
}
.shipping-progress.free .shipping-progress-text { color: #2ecc71; justify-content: center; }
.shipping-amount { color: var(--red-bright); }
.shipping-bar {
  height: 2px; background: var(--border); overflow: hidden;
}
.shipping-bar-fill {
  height: 100%; background: linear-gradient(90deg, var(--red-deep), var(--red-bright));
  transition: width 0.5s ease;
}

/* EMPTY STATE */
.cart-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 16px; padding: 60px 40px; text-align: center;
}
.cart-empty-icon { width: 60px; height: 60px; color: rgba(192,57,43,0.2); }
.cart-empty-title { font-family: var(--font-cinzel); font-size: 16px; color: var(--white); letter-spacing: 0.1em; }
.cart-empty-sub { font-size: 12px; color: var(--mid); letter-spacing: 0.05em; }

/* CART CONTENT */
.cart-content { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.cart-items {
  flex: 1; overflow-y: auto; padding: 20px 32px;
  display: flex; flex-direction: column; gap: 0;
}
.cart-item {
  display: flex; gap: 16px; align-items: flex-start;
  padding: 20px 0;
  border-bottom: 1px solid var(--border);
  position: relative;
  transition: background 0.15s;
}
.cart-item:first-child { padding-top: 4px; }
.cart-item:last-child { border-bottom: none; }
.cart-item-img {
  width: 80px; height: 100px; flex-shrink: 0;
  background: var(--surface); border: 1px solid var(--border);
  overflow: hidden; display: flex; align-items: center; justify-content: center;
}
.cart-item-img img { width: 100%; height: 100%; object-fit: cover; }
.cart-item-img-placeholder { font-family: var(--font-gothic); font-size: 14px; color: rgba(192,57,43,0.2); }
.cart-item-info { flex: 1; min-width: 0; }
.cart-item-category {
  font-family: var(--font-cinzel); font-size: 8px;
  letter-spacing: 0.2em; color: var(--red); text-transform: uppercase; margin-bottom: 5px;
}
.cart-item-name {
  font-family: var(--font-cinzel); font-size: 13px; color: var(--white);
  line-height: 1.4; margin-bottom: 4px;
}
.cart-item-size {
  font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.12em;
  color: var(--red-bright); text-transform: uppercase; margin-bottom: 10px;
}
.cart-item-price-row { display: flex; align-items: center; justify-content: space-between; }
.cart-item-qty { display: flex; align-items: center; gap: 0; border: 1px solid var(--border); }
.qty-btn {
  background: none; border: none; color: var(--white);
  width: 30px; height: 30px; cursor: pointer; font-size: 16px; line-height: 1;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.qty-btn:hover { background: var(--red-deep); color: var(--white); }
.qty-value {
  font-family: var(--font-cinzel); font-size: 13px; color: var(--white);
  min-width: 30px; text-align: center; line-height: 30px; border-left: 1px solid var(--border); border-right: 1px solid var(--border);
}
.cart-item-price { font-family: var(--font-cinzel); font-size: 14px; color: var(--off-white); }
.cart-item-remove {
  position: absolute; top: 18px; right: 0; background: none; border: none;
  color: var(--border); cursor: pointer; padding: 4px; transition: color 0.2s;
}
.cart-item-remove:hover { color: var(--red-bright); }

/* PRICE SUMMARY */
.cart-price-summary {
  padding: 20px 32px 16px;
  border-top: 1px solid var(--border-red);
  background: var(--surface);
  flex-shrink: 0;
}
.price-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.price-label { font-family: var(--font-cinzel); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--mid); }
.price-value { font-family: var(--font-cinzel); font-size: 13px; color: var(--off-white); }
.free-tag { color: #2ecc71; font-size: 10px; letter-spacing: 0.1em; }
.price-divider { height: 1px; background: var(--border); margin: 12px 0; }
.total-row { margin-bottom: 0; }
.price-label-total { font-family: var(--font-cinzel); font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--white); font-weight: 600; }
.price-value-total { font-family: var(--font-gothic); font-size: 24px; color: var(--white); text-shadow: 0 0 20px var(--red-glow); }
.delivery-note { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.1em; color: var(--mid); margin-top: 10px; line-height: 1.6; }
.pvz-hint { font-size: 11px; color: #c8a84b; background: rgba(200,168,75,0.08); border: 1px solid rgba(200,168,75,0.25); padding: 7px 10px; margin-bottom: 8px; line-height: 1.5; }

/* CART FOOTER */
.cart-footer {
  padding: 16px 32px 28px;
  display: flex; flex-direction: column; gap: 12px;
  background: var(--surface);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.btn-checkout-main {
  width: 100%;
  background: transparent;
  color: var(--red-bright);
  border: 1px solid var(--red);
  padding: 17px;
  font-family: var(--font-cinzel);
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-checkout-main:hover {
  background: var(--red-deep);
  border-color: var(--red-bright);
  color: var(--white);
  box-shadow: 0 0 30px var(--red-glow);
}
.cart-clear {
  background: none; border: none; color: var(--mid);
  font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.15em;
  cursor: pointer; text-decoration: underline; text-transform: uppercase;
  text-align: center; transition: color 0.2s;
}
.cart-clear:hover { color: var(--red-bright); }

/* ─── CHECKOUT ─── */
.cart-checkout { border-top: 2px solid var(--border-red); flex-shrink: 0; }

/* STEPS */
.checkout-steps {
  display: flex; align-items: center; gap: 0;
  padding: 20px 32px; border-bottom: 1px solid var(--border);
}
.checkout-step { display: flex; align-items: center; gap: 8px; }
.step-dot {
  width: 26px; height: 26px; border-radius: 50%;
  border: 1px solid var(--border); color: var(--mid);
  font-family: var(--font-cinzel); font-size: 10px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.3s;
}
.checkout-step.active .step-dot { border-color: var(--red); color: var(--red-bright); background: rgba(192,57,43,0.1); }
.checkout-step.done .step-dot { border-color: #2ecc71; color: #2ecc71; background: rgba(46,204,113,0.08); }
.checkout-step span { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--mid); }
.checkout-step.active span { color: var(--white); }
.step-line { flex: 1; height: 1px; background: var(--border); margin: 0 12px; transition: background 0.3s; }
.step-line.done { background: rgba(46,204,113,0.4); }

.cart-checkout-body {
  padding: 24px 32px 32px;
  display: flex; flex-direction: column; gap: 22px;
}

/* FORM */
.form-section { display: flex; flex-direction: column; gap: 14px; }
.form-section-title {
  font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--red);
  padding-bottom: 10px; border-bottom: 1px solid var(--border-red);
}
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.form-label {
  font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--light);
}
.form-input {
  background: var(--surface); border: 1px solid var(--border);
  color: var(--white); font-family: var(--font-body); font-size: 13px;
  padding: 10px 14px; outline: none; transition: border-color 0.2s;
  width: 100%;
}
.form-input:focus { border-color: var(--red); background: var(--card); }
.form-input.error { border-color: #e74c3c; }
.form-input::placeholder { color: rgba(102,102,102,0.6); }
.form-textarea { min-height: 72px; resize: vertical; }
.form-error { font-size: 10px; color: #e74c3c; letter-spacing: 0.05em; }

/* DELIVERY OPTIONS */
.delivery-options { display: flex; flex-direction: column; gap: 8px; }
.delivery-option {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border: 1px solid var(--border);
  cursor: pointer; transition: all 0.2s; background: var(--surface);
}
.delivery-option.active { border-color: var(--red); background: rgba(192,57,43,0.06); }
.delivery-option:hover:not(.active) { border-color: var(--border-red); }
.delivery-radio { margin: 0; accent-color: var(--red-bright); flex-shrink: 0; }
.delivery-option-icon { font-size: 18px; flex-shrink: 0; }
.delivery-option-content { flex: 1; }
.delivery-option-name { font-family: var(--font-cinzel); font-size: 12px; color: var(--white); margin-bottom: 2px; }
.delivery-option-desc { font-size: 10px; color: var(--mid); }
.delivery-option-days { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.1em; color: var(--red-bright); flex-shrink: 0; }

/* TABS */
.delivery-type-tabs, .contact-type-tabs { display: flex; gap: 0; margin-bottom: 12px; }
.contact-type-tabs .tab-btn:first-child { border-right: none; }
.tab-btn {
  flex: 1; padding: 10px; font-family: var(--font-cinzel);
  font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase;
  background: none; border: 1px solid var(--border); color: var(--mid);
  cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;
}
.tab-btn:first-child { border-right: none; }
.tab-btn.active { background: var(--red-deep); border-color: var(--red); color: var(--white); }
.tab-icon { font-size: 14px; }

/* MAP */
.map-container { display: flex; flex-direction: column; gap: 0; }
.map-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-bottom: none;
}
.map-label { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--light); }
.map-ext-link { font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.1em; color: var(--red-bright); transition: color 0.2s; }
.map-ext-link:hover { color: var(--white); }

.map-overlay-hint {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(transparent, rgba(17,17,17,0.9));
  padding: 20px 14px 10px;
  pointer-events: none;
}
.map-overlay-hint span { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.1em; color: var(--mid); }

/* ADDRESS SUGGESTIONS */
.address-search-wrapper { position: relative; }
.address-suggestions {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
  background: var(--card); border: 1px solid var(--border-red);
  border-top: none;
}
.address-suggestion {
  padding: 10px 14px; font-size: 12px; color: var(--light);
  cursor: pointer; transition: all 0.15s;
  border-bottom: 1px solid var(--border);
}
.address-suggestion:last-child { border-bottom: none; }
.address-suggestion:hover { background: rgba(192,57,43,0.1); color: var(--white); }

/* COURIER FORM */


/* OFERTA */
.oferta-section { padding-top: 4px; }
.oferta-label { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }
.oferta-label.error .oferta-text { color: #e74c3c; }
.oferta-checkbox { margin-top: 2px; width: 15px; height: 15px; accent-color: var(--red-bright); flex-shrink: 0; }
.oferta-text { font-size: 11px; color: var(--light); line-height: 1.7; }
.form-link { color: var(--red-bright); text-decoration: underline; }

/* CHECKOUT NAV */
.checkout-nav { display: flex; gap: 10px; align-items: center; padding-top: 4px; }
.submit-error { font-size: 12px; color: var(--red-bright); padding: 10px 14px; background: rgba(192,57,43,0.08); border-left: 3px solid var(--red); margin-bottom: 8px; }
.btn-back-sm {
  background: none; border: 1px solid var(--border); color: var(--mid);
  font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.15em;
  text-transform: uppercase; padding: 10px 16px; cursor: pointer; transition: all 0.2s;
  white-space: nowrap; flex-shrink: 0;
}
.btn-back-sm:hover { border-color: var(--white); color: var(--white); }
.btn-proceed {
  flex: 1; background: transparent; color: var(--red-bright);
  border: 1px solid var(--red); padding: 12px;
  font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.22em;
  text-transform: uppercase; cursor: pointer; transition: all 0.3s;
}
.btn-proceed:hover:not(:disabled) { background: var(--red-deep); color: var(--white); border-color: var(--red-bright); }
.btn-proceed:disabled { opacity: 0.35; cursor: not-allowed; }

/* ORDER REVIEW */
.order-review { display: flex; flex-direction: column; gap: 16px; }
.order-items-list { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--border); }
.order-item-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px; border-bottom: 1px solid var(--border);
}
.order-item-row:last-child { border-bottom: none; }
.order-item-img {
  width: 44px; height: 44px; flex-shrink: 0;
  background: var(--surface); border: 1px solid var(--border); overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.order-item-img img { width: 100%; height: 100%; object-fit: cover; }
.order-item-img-ph { font-family: var(--font-gothic); font-size: 11px; color: rgba(192,57,43,0.2); }
.order-item-details { flex: 1; }
.order-item-name { font-family: var(--font-cinzel); font-size: 11px; color: var(--white); }
.order-item-size { font-size: 10px; color: var(--mid); margin-top: 1px; }
.order-item-qty { font-size: 10px; color: var(--mid); }
.order-item-price { font-family: var(--font-cinzel); font-size: 12px; color: var(--off-white); }

.order-summary-table { background: var(--surface); border: 1px solid var(--border); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.summary-line { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--light); }
.summary-line span:last-child { color: var(--off-white); text-align: right; max-width: 55%; }
.summary-divider { height: 1px; background: var(--border-red); }
.summary-total { padding-top: 4px; }
.summary-total span { font-family: var(--font-cinzel); font-size: 14px; color: var(--white); font-weight: 600; letter-spacing: 0.1em; }

.payment-note {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 11px; color: var(--mid); line-height: 1.7;
  padding: 12px 14px; border-left: 2px solid var(--border-red);
  background: rgba(192,57,43,0.03);
}
.payment-note svg { flex-shrink: 0; margin-top: 1px; }
.payment-error {
  background: rgba(231,76,60,0.1); border: 1px solid var(--red);
  color: var(--red-bright); padding: 10px 14px; font-size: 11px;
}
.btn-pay {
  flex: 1; background: transparent; color: var(--red-bright);
  border: 1px solid var(--red); padding: 14px;
  font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.22em;
  text-transform: uppercase; cursor: pointer; transition: all 0.3s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.btn-pay:hover:not(:disabled) { background: var(--red-deep); color: var(--white); box-shadow: 0 0 30px var(--red-glow); }
.btn-pay:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-spinner {
  width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.25);
  border-top-color: var(--white); border-radius: 50%;
  animation: spin 0.7s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── FOOTER ─── */
footer {
  background: var(--deep);
  border-top: 1px solid var(--border-red);
  padding: 60px 40px 30px;
  margin-top: 80px;
}
.footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }
.footer-logo { font-family: var(--font-gothic); font-size: 32px; color: var(--white); text-shadow: 0 0 20px var(--red-glow); margin-bottom: 16px; font-weight: 400; }
.footer-brand p { color: var(--mid); font-size: 12px; line-height: 1.8; max-width: 280px; }
.footer-col h4 { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--red); margin-bottom: 16px; }
.footer-col ul { list-style: none; }
.footer-col ul li { margin-bottom: 10px; }
.footer-col ul li a { color: var(--mid); font-size: 12px; transition: color 0.2s; }
.footer-col ul li a:hover { color: var(--white); }
.footer-bottom { border-top: 1px solid var(--border); padding-top: 20px; display: flex; justify-content: space-between; font-size: 10px; letter-spacing: 0.1em; color: var(--mid); }
.footer-tagline { font-family: var(--font-cinzel); color: var(--red-deep); letter-spacing: 0.15em; }

/* ─── TOAST ─── */
.toast {
  position: fixed; bottom: 30px; right: 30px;
  background: var(--red-deep); border: 1px solid var(--red);
  color: var(--white); padding: 14px 22px;
  font-size: 11px; letter-spacing: 0.1em; z-index: 900;
  transform: translateY(20px); opacity: 0; transition: all 0.3s;
  pointer-events: none; font-family: var(--font-cinzel);
}
.toast.show { transform: translateY(0); opacity: 1; }

/* ─── SHARED FORM STYLES (global-ish inside scoped) ─── */
.btn-primary {
  display: inline-block; background: transparent; color: var(--red-bright);
  padding: 14px 40px; font-family: var(--font-cinzel); font-size: 9px;
  letter-spacing: 0.25em; text-transform: uppercase; border: 1px solid var(--red);
  cursor: pointer; transition: all 0.3s; width: fit-content; text-decoration: none;
}
.btn-primary:hover { background: var(--red-deep); border-color: var(--red-bright); color: var(--white); box-shadow: 0 0 30px var(--red-glow); }

/* ─── CDEK INLINE MAP ─── */
.cdek-map-inline {
  width: 100%;
  min-height: 400px;
  border: 1px solid var(--border);
  margin-top: 4px;
  background: var(--surface);
}
.cdek-selected-pvz {
  display: flex; align-items: flex-start; gap: 12px;
  background: rgba(192,57,43,0.06); border: 1px solid var(--border-red); padding: 12px 14px; margin-top: 8px;
}
.cdek-pvz-info { display: flex; align-items: flex-start; gap: 10px; flex: 1; }
.cdek-pvz-icon { font-size: 20px; flex-shrink: 0; }
.cdek-pvz-city { font-family: var(--font-cinzel); font-size: 9px; color: var(--red-bright); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 2px; }
.cdek-pvz-address { font-size: 11px; color: var(--white); line-height: 1.5; }
.cdek-pvz-code { font-size: 10px; color: var(--mid); margin-top: 2px; }

/* ─── RESPONSIVE ─── */
@media (max-width: 900px) {
  .cart-drawer { max-width: 100%; }
  .header-inner { padding: 0 20px; }
  .nav-left { display: none; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
  .form-row-2 { grid-template-columns: 1fr; }
  .form-row-3 { grid-template-columns: 1fr 1fr; }
}
</style>
