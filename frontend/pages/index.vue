<template>
  <div>
    <!-- ═══ HERO ═══════════════════════════════════════════════ -->
    <section class="hero">
      <div class="hero-text">
        <div class="hero-eyebrow">Новая коллаборация 3.5</div>
        <h1 class="hero-title">
          4PLAYAZ<br>
          <span class="hero-accent">STORE.</span>
        </h1>
        <p class="hero-desc">
          Уличная одежда не для всех. Коллаборации DJ XBOX360 и 3.5 PROPOVEDNIK.
        </p>
        <button class="btn-primary" @click="scrollToProducts">Смотреть</button>
      </div>

      <!-- КАРУСЕЛЬ НОВИНОК -->
      <div class="hero-carousel">
        <template v-if="newProducts.length > 0">
          <div class="carousel-track" :style="{ transform: `translateX(-${carouselIndex * 100}%)` }">
            <div v-for="product in newProducts" :key="product.id" class="carousel-slide" @click="openProduct(product)">
              <img v-if="product.image" :src="resolveImg(product.image)" :alt="product.name" class="carousel-img">
              <div v-else class="carousel-placeholder"><span>4PLAYAZ</span></div>
              <div class="carousel-info">
                <div class="carousel-badge">NEW</div>
                <div class="carousel-name">{{ product.name }}</div>
                <div class="carousel-price">{{ formatPrice(product.price) }}</div>
              </div>
            </div>
          </div>
          <div class="carousel-nav" v-if="newProducts.length > 1">
            <button class="carousel-btn prev" @click="prevSlide">‹</button>
            <div class="carousel-dots">
              <button v-for="(_, i) in newProducts" :key="i" class="dot" :class="{ active: i === carouselIndex }" @click="carouselIndex = i"></button>
            </div>
            <button class="carousel-btn next" @click="nextSlide">›</button>
          </div>
        </template>
        <template v-else>
          <div class="hero-placeholder">
            <span class="hero-placeholder-text">4PLAYAZ</span>
            <div class="hero-placeholder-lines">
              <div v-for="i in 6" :key="i" class="hero-line" :style="{ animationDelay: `${i * 0.3}s` }"></div>
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- PRODUCTS SECTION -->
    <div class="section-header" id="products">
      <h2 class="section-title">{{ sectionTitle }}</h2>
      <span class="count">{{ filteredProducts.length }} позиций</span>
    </div>

    <!-- FILTERS -->
    <div class="filters-bar filters-clothing">
      <button class="filter-btn" :class="{ active: currentClothingType === '' && currentFilter === '' }" @click="filterClothingType(''); filterCategory('')">Все</button>
      <button class="filter-btn" :class="{ active: currentClothingType === '__new__' }" @click="filterClothingType('__new__'); filterCategory('')">Новинки</button>
      <button class="filter-btn" :class="{ active: currentClothingType === 'hoodie' }" @click="filterClothingType('hoodie'); filterCategory('')">Худи</button>
      <button class="filter-btn" :class="{ active: currentClothingType === 'tshirt' }" @click="filterClothingType('tshirt'); filterCategory('')">Футболки</button>
      <button class="filter-btn" :class="{ active: currentClothingType === 'longsleeve' }" @click="filterClothingType('longsleeve'); filterCategory('')">Лонгсливы</button>
    </div>

    <div class="filters-bar filters-collections">
      <span class="filters-label">Коллекция:</span>
      <button v-for="cat in categories" :key="cat.value" class="filter-btn filter-btn-sm" :class="{ active: currentFilter === cat.value }" @click="filterCategory(cat.value)">{{ cat.label }}</button>
    </div>

    <div class="sort-row">
      <label>Сортировка</label>
      <select v-model="currentSort">
        <option value="default">По умолчанию</option>
        <option value="price-asc">Цена: по возрастанию</option>
        <option value="price-desc">Цена: по убыванию</option>
        <option value="name">По названию</option>
      </select>
    </div>

    <!-- PRODUCTS GRID -->
    <div class="products-grid" v-if="!loading && filteredProducts.length > 0">
      <div v-for="product in filteredProducts" :key="product.id" class="product-card" @click="openProduct(product)">
        <div class="product-card-image">
          <img v-if="product.image" :src="resolveImg(product.image)" :alt="product.name" loading="lazy" class="card-img">
          <div v-else class="no-img">4PZ</div>
          <span v-if="product.badge" class="product-badge" :class="{ sale: product.badge === 'Sale' }">{{ product.badge }}</span>
          <div class="card-overlay"><span class="card-cta">В КОРЗИНУ</span></div>
        </div>
        <div class="product-info">
          <div class="product-category">{{ product.category }}</div>
          <div class="product-name">{{ product.name }}</div>
          <div class="product-price">
            <span v-if="product.oldPrice" class="old-price">{{ formatPrice(product.oldPrice) }}</span>
            {{ formatPrice(product.price) }}
          </div>
          <div v-if="product.desc" class="product-desc">{{ product.desc }}</div>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Загрузка коллекции...</span>
    </div>

    <div v-else class="empty-state">
      <p>Товары не найдены</p>
      <button class="btn-primary" @click="filterCategory('')">Показать все</button>
    </div>

    <!-- ═══ PRODUCT MODAL ═══════════════════════════════════════ -->
    <Teleport to="body">
      <div class="modal-overlay" :class="{ open: modalOpen }" @click.self="closeModal">
        <div class="modal-wrapper" v-if="selectedProduct">
          <button class="modal-close" @click="closeModal">✕</button>
          <div class="modal">
            <!-- MEDIA -->
            <div class="modal-media">
              <template v-if="selectedProduct.images && selectedProduct.images.length > 1">
                <div class="modal-carousel">
                  <div class="modal-carousel-track" :style="{ transform: `translateX(-${modalImgIndex * 100}%)` }">
                    <img v-for="(img, i) in selectedProduct.images" :key="i" :src="resolveImg(img)" :alt="selectedProduct.name" class="modal-carousel-img">
                  </div>
                  <button class="modal-carousel-btn prev" @click.stop="prevModalImg">‹</button>
                  <button class="modal-carousel-btn next" @click.stop="nextModalImg">›</button>
                  <div class="modal-dots">
                    <span v-for="(_, i) in selectedProduct.images" :key="i" class="modal-dot" :class="{ active: i === modalImgIndex }" @click.stop="modalImgIndex = Number(i)"></span>
                  </div>
                </div>
              </template>
              <template v-else>
                <img v-if="selectedProduct.image" :src="resolveImg(selectedProduct.image)" :alt="selectedProduct.name" class="modal-img">
                <div v-else class="modal-img-placeholder">4PZ</div>
              </template>
            </div>

            <!-- INFO -->
            <div class="modal-info">
              <div class="modal-category">{{ selectedProduct.category }}</div>
              <div class="modal-name">{{ selectedProduct.name }}</div>
              <div class="modal-price">
                <span v-if="selectedProduct.oldPrice" class="modal-old-price">{{ formatPrice(selectedProduct.oldPrice) }}</span>
                {{ formatPrice(selectedProduct.price) }}
              </div>
              <div class="modal-desc">{{ selectedProduct.desc || 'Описание не добавлено.' }}</div>
              <div v-if="selectedProduct.images && selectedProduct.images.length > 1" class="modal-thumbs">
                <img v-for="(img, i) in selectedProduct.images" :key="i" :src="resolveImg(img)" class="modal-thumb" :class="{ active: i === modalImgIndex }" @click="modalImgIndex = Number(i)">
              </div>
              <button class="btn-primary btn-buy" @click="handleAddToCart(selectedProduct)">
                Добавить в корзину
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══ CHECKOUT MODAL ═══════════════════════════════════════ -->
    <Teleport to="body">
      <div class="modal-overlay checkout-overlay" :class="{ open: checkoutOpen }" @click.self="closeCheckout">
        <div class="checkout-wrapper">
          <button class="modal-close" @click="closeCheckout">✕</button>

          <!-- STEP 1: ДАННЫЕ И ДОСТАВКА -->
          <div v-if="checkoutStep === 1" class="checkout-panel">
            <div class="checkout-header">
              <div class="checkout-step-label">Шаг 1 из 2</div>
              <h2 class="checkout-title">Оформление заказа</h2>
              <div class="checkout-product-mini" v-if="checkoutProduct">
                <img v-if="checkoutProduct.image" :src="resolveImg(checkoutProduct.image)" class="checkout-product-img">
                <div>
                  <div class="checkout-product-name">{{ checkoutProduct.name }}</div>
                  <div class="checkout-product-price">{{ formatPrice(checkoutProduct.price) }}</div>
                </div>
              </div>
            </div>

            <div class="checkout-form">
              <div class="form-section">
                <h3 class="form-section-title">Ваши данные</h3>
                <div class="form-group">
                  <label class="form-label">ФИО *</label>
                  <input v-model="form.fullName" type="text" class="form-input" :class="{ error: errors.fullName }" placeholder="Иванов Иван Иванович">
                  <span v-if="errors.fullName" class="form-error">{{ errors.fullName }}</span>
                </div>
                <div class="form-group">
                  <label class="form-label">Email *</label>
                  <input v-model="form.email" type="email" class="form-input" :class="{ error: errors.email }" placeholder="ivan@mail.ru">
                  <span v-if="errors.email" class="form-error">{{ errors.email }}</span>
                </div>
              </div>

              <div class="form-section">
                <h3 class="form-section-title">Способ доставки</h3>
                <div class="delivery-options">
                  <label v-for="opt in deliveryOptions" :key="opt.value" class="delivery-option" :class="{ active: form.deliveryMethod === opt.value }">
                    <input type="radio" v-model="form.deliveryMethod" :value="opt.value" class="delivery-radio">
                    <div class="delivery-option-content">
                      <div class="delivery-option-name">{{ opt.name }}</div>
                      <div class="delivery-option-desc">{{ opt.desc }}</div>
                    </div>
                  </label>
                </div>
                <span v-if="errors.deliveryMethod" class="form-error">{{ errors.deliveryMethod }}</span>
              </div>

              <!-- АДРЕС ДОСТАВКИ -->
              <div class="form-section" v-if="form.deliveryMethod">
                <h3 class="form-section-title">Адрес доставки</h3>
                <div class="form-group">
                  <label class="form-label">Город *</label>
                  <input v-model="form.city" type="text" class="form-input" :class="{ error: errors.city }" placeholder="Москва">
                  <span v-if="errors.city" class="form-error">{{ errors.city }}</span>
                </div>
                <div class="form-group">
                  <label class="form-label">Улица, дом, квартира *</label>
                  <input v-model="form.address" type="text" class="form-input" :class="{ error: errors.address }" placeholder="ул. Ленина, д. 5, кв. 10">
                  <span v-if="errors.address" class="form-error">{{ errors.address }}</span>
                </div>
                <div class="form-group">
                  <label class="form-label">Индекс *</label>
                  <input v-model="form.postalCode" type="text" class="form-input" :class="{ error: errors.postalCode }" placeholder="123456">
                  <span v-if="errors.postalCode" class="form-error">{{ errors.postalCode }}</span>
                </div>
              </div>

              <!-- ОФЕРТА -->
              <div class="form-section oferta-section">
                <label class="oferta-label" :class="{ error: errors.oferta }">
                  <input type="checkbox" v-model="form.ofertaAccepted" class="oferta-checkbox">
                  <span class="oferta-text">
                    Я принимаю условия
                    <a href="/oferta" target="_blank" class="form-link">договора оферты</a>
                    и даю согласие на обработку персональных данных
                  </span>
                </label>
                <span v-if="errors.oferta" class="form-error">{{ errors.oferta }}</span>
              </div>

              <button class="btn-primary btn-checkout-next" :disabled="!form.ofertaAccepted" @click="proceedToPayment">
                {{ form.ofertaAccepted ? 'Перейти к оплате →' : 'Примите условия оферты' }}
              </button>
            </div>
          </div>

          <!-- STEP 2: ОПЛАТА -->
          <div v-if="checkoutStep === 2" class="checkout-panel">
            <div class="checkout-header">
              <div class="checkout-step-label">Шаг 2 из 2</div>
              <h2 class="checkout-title">Оплата</h2>
            </div>

            <div class="order-summary">
              <div class="summary-row">
                <span>Товар</span>
                <span>{{ checkoutProduct?.name }}</span>
              </div>
              <div class="summary-row">
                <span>Получатель</span>
                <span>{{ form.fullName }}</span>
              </div>
              <div class="summary-row">
                <span>Адрес</span>
                <span>{{ fullAddress }}</span>
              </div>
              <div class="summary-row total">
                <span>Итого</span>
                <span>{{ formatPrice(checkoutProduct?.price || 0) }}</span>
              </div>
            </div>

            <div class="payment-note">
              <p>Нажимая «Оплатить», вы будете перенаправлены на страницу безопасной оплаты ЮКасса.</p>
            </div>

            <div v-if="paymentError" class="payment-error">{{ paymentError }}</div>

            <div class="checkout-actions">
              <button class="btn-back" @click="checkoutStep = 1">← Назад</button>
              <button class="btn-primary btn-pay" :disabled="paymentLoading" @click="createPayment">
                <span v-if="paymentLoading" class="btn-spinner"></span>
                {{ paymentLoading ? 'Создаём заказ...' : `Оплатить ${formatPrice(checkoutProduct?.price || 0)}` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, nextTick } from 'vue'
import { useApi } from '~/composables/useApi'

const config = useRuntimeConfig()
const API_BASE = config.public.apiBase as string
const YANDEX_API_KEY = config.public.yandexApiKey

// In static mode (no apiBase), uploads live on the backend — unavailable on GitHub Pages.
const resolveImg = (src: string): string => {
  if (!src) return ''
  if (src.startsWith('data:') || src.startsWith('http')) return src
  if (!API_BASE && src.startsWith('/uploads/')) return ''
  return `${API_BASE}${src}`
}

// useRoute must be called at setup level (not after await inside onMounted)
const route = useRoute()

const { getProducts } = useApi()

// Inject cart functions from layout
const addToCartFn = inject<(product: any) => void>('addToCart')

const handleAddToCart = (product: any) => {
  if (addToCartFn) addToCartFn(product)
  closeModal()
}

// ─── PRODUCTS STATE ────────────────────────────────────────
const allProducts = ref<any[]>([])
const loading = ref(true)
const currentFilter = ref('')
const currentSort = ref('default')
const currentClothingType = ref('')
const modalOpen = ref(false)
const selectedProduct = ref<any>(null)
const modalImgIndex = ref(0)
const carouselIndex = ref(0)

// ─── CHECKOUT STATE ────────────────────────────────────────
const checkoutOpen = ref(false)
const checkoutStep = ref(1)
const checkoutProduct = ref<any>(null)
const paymentLoading = ref(false)
const paymentError = ref('')

const form = ref({
  fullName: '',
  email: '',
  deliveryMethod: '',
  city: '',
  address: '',
  postalCode: '',
  ofertaAccepted: false
})

const errors = ref<Record<string, string>>({})

const deliveryOptions = [
  { value: 'cdek', name: 'СДЭК', desc: 'Пункт выдачи или курьер · стоимость рассчитывается по адресу' },
]


const fullAddress = computed(() => {
  return [form.value.city, form.value.address, form.value.postalCode].filter(Boolean).join(', ')
})

// ─── VALIDATION ────────────────────────────────────────────
const validateStep1 = () => {
  const e: Record<string, string> = {}
  if (!form.value.fullName.trim()) e.fullName = 'Введите ФИО'
  if (!form.value.email.trim()) e.email = 'Введите email'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) e.email = 'Неверный формат email'
  if (!form.value.deliveryMethod) e.deliveryMethod = 'Выберите способ доставки'
  if (!form.value.city.trim()) e.city = 'Введите город'
  if (!form.value.address.trim()) e.address = 'Введите адрес'
  if (!form.value.postalCode.trim()) e.postalCode = 'Введите индекс'
  if (!form.value.ofertaAccepted) e.oferta = 'Необходимо принять условия оферты'
  errors.value = e
  return Object.keys(e).length === 0
}

const proceedToPayment = () => {
  if (validateStep1()) {
    checkoutStep.value = 2
    paymentError.value = ''
  }
}

// ─── PAYMENT ───────────────────────────────────────────────
const createPayment = async () => {
  if (!checkoutProduct.value) return
  paymentLoading.value = true
  paymentError.value = ''

  try {
    const res: any = await $fetch(`${API_BASE}/api/payment/create`, {
      method: 'POST',
      body: {
        productId: checkoutProduct.value.id,
        productName: checkoutProduct.value.name,
        amount: checkoutProduct.value.price,
        customer: {
          fullName: form.value.fullName,
          email: form.value.email,
        },
        delivery: {
          method: form.value.deliveryMethod,
          city: form.value.city,
          address: form.value.address,
          postalCode: form.value.postalCode || null,
          deliveryPrice: 0,
        },
      }
    })
    if (res.confirmationUrl) {
      window.location.href = res.confirmationUrl
    } else {
      paymentError.value = 'Не удалось создать платёж. Попробуйте снова.'
    }
  } catch (err: any) {
    paymentError.value = err?.data?.message || 'Ошибка при создании платежа'
  } finally {
    paymentLoading.value = false
  }
}

// ─── CAROUSEL ──────────────────────────────────────────────
const newProducts = computed(() => {
  const withNew = allProducts.value.filter((p: any) => p.badge === 'New' && resolveImg(p.image))
  if (withNew.length < 3) {
    const others = allProducts.value.filter((p: any) => p.badge !== 'New' && resolveImg(p.image))
    return [...withNew, ...others].slice(0, 6)
  }
  return withNew
})

const nextSlide = () => { carouselIndex.value = (carouselIndex.value + 1) % newProducts.value.length }
const prevSlide = () => { carouselIndex.value = (carouselIndex.value - 1 + newProducts.value.length) % newProducts.value.length }

let autoplayTimer: ReturnType<typeof setInterval> | null = null
const startAutoplay = () => {
  autoplayTimer = setInterval(() => { if (newProducts.value.length > 1) nextSlide() }, 4000)
}

const prevModalImg = () => {
  if (!selectedProduct.value?.images) return
  modalImgIndex.value = (modalImgIndex.value - 1 + selectedProduct.value.images.length) % selectedProduct.value.images.length
}
const nextModalImg = () => {
  if (!selectedProduct.value?.images) return
  modalImgIndex.value = (modalImgIndex.value + 1) % selectedProduct.value.images.length
}

// ─── FILTERS ───────────────────────────────────────────────
const categories = [
  { value: '', label: 'ВСЕ' },
  { value: 'DJ XBOX360', label: 'DJ XBOX360' },
  { value: '3.5 PROPOVEDNIK COLLECTION', label: '3.5 PROPOVEDNIK COLLECTION' },
]

const filteredProducts = computed(() => {
  let list = [...allProducts.value]
  if (currentFilter.value) list = list.filter((p: any) => p.category === currentFilter.value)
  if (currentClothingType.value === '__new__') {
    list = list.filter((p: any) => p.badge === 'New')
  } else if (currentClothingType.value) {
    list = list.filter((p: any) => p.clothingType === currentClothingType.value)
  }
  if (currentSort.value === 'price-asc') list.sort((a: any, b: any) => a.price - b.price)
  else if (currentSort.value === 'price-desc') list.sort((a: any, b: any) => b.price - a.price)
  else if (currentSort.value === 'name') list.sort((a: any, b: any) => a.name.localeCompare(b.name))
  return list
})

const sectionTitle = computed(() => {
  if (currentClothingType.value === '__new__') return 'Новинки'
  const typeLabels: Record<string, string> = { hoodie: 'Худи', tshirt: 'Футболки', longsleeve: 'Лонгсливы', jacket: 'Куртки' }
  if (currentClothingType.value && typeLabels[currentClothingType.value]) return typeLabels[currentClothingType.value]
  return currentFilter.value || 'Все товары'
})

const filterCategory = (cat: string) => { currentFilter.value = cat }
const filterClothingType = (type: string) => { currentClothingType.value = type }
const formatPrice = (price: number) => price.toLocaleString('ru') + ' ₽'

// ─── MODALS ────────────────────────────────────────────────
const openProduct = (product: any) => {
  selectedProduct.value = product
  modalImgIndex.value = 0
  modalOpen.value = true
  document.body.style.overflow = 'hidden'
}
const closeModal = () => {
  modalOpen.value = false
  document.body.style.overflow = ''
}

const openCheckout = (product: any) => {
  checkoutProduct.value = product
  checkoutStep.value = 1
  checkoutOpen.value = true
  form.value = {
    fullName: '', email: '',
    deliveryMethod: '',
    city: '', address: '',
    postalCode: '', ofertaAccepted: false
  }
  errors.value = {}
  paymentError.value = ''
}
const closeCheckout = () => {
  checkoutOpen.value = false
  document.body.style.overflow = ''
}

const scrollToProducts = () => {
  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(async () => {
  // Загружаем СДЭК виджет
  if (!document.getElementById('cdek-widget-script')) {
    const script = document.createElement('script')
    script.id = 'cdek-widget-script'
    script.src = 'https://cdn.jsdelivr.net/npm/@cdek-it/widget@3'
    script.type = 'module'
    document.head.appendChild(script)
  }

  try {
    allProducts.value = await getProducts() as any[]
  } catch {
    allProducts.value = []
  } finally {
    loading.value = false
  }
  startAutoplay()
  if (route.query.type) currentClothingType.value = route.query.type as string
})

onUnmounted(() => {
  if (autoplayTimer) clearInterval(autoplayTimer)
})
</script>

<style scoped>
/* ─── HERO ─── */
.hero { display: grid; grid-template-columns: 1fr 1fr; min-height: 88vh; overflow: hidden; }
.hero-text { display: flex; flex-direction: column; justify-content: center; padding: 80px 64px; background: var(--deep); border-right: 1px solid var(--border-red); }
.hero-eyebrow { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.35em; color: var(--red); text-transform: uppercase; margin-bottom: 24px; }
.hero-title { font-family: var(--font-gothic); font-weight: 400; font-size: clamp(52px, 6vw, 90px); line-height: 1.0; letter-spacing: 0.02em; color: var(--white); margin-bottom: 28px; text-shadow: 0 0 60px rgba(192,57,43,0.2); }
.hero-accent { color: var(--red-bright); text-shadow: 0 0 30px var(--red); }
.hero-desc { color: var(--mid); font-size: 13px; line-height: 1.8; max-width: 380px; margin-bottom: 40px; }
.btn-primary { display: inline-block; background: transparent; color: var(--red-bright); padding: 14px 40px; font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.25em; text-transform: uppercase; border: 1px solid var(--red); cursor: pointer; transition: all 0.3s; width: fit-content; text-decoration: none; }
.btn-primary:hover { background: var(--red-deep); border-color: var(--red-bright); color: var(--white); box-shadow: 0 0 30px var(--red-glow); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary:disabled:hover { background: transparent; border-color: var(--red); color: var(--red-bright); box-shadow: none; }

/* ─── HERO CAROUSEL ─── */
.hero-carousel { position: relative; background: var(--surface); overflow: hidden; display: flex; flex-direction: column; }
.carousel-track { display: flex; width: 100%; height: 100%; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); flex: 1; }
.carousel-slide { min-width: 100%; position: relative; cursor: pointer; overflow: hidden; }
.carousel-img { width: 100%; height: 100%; object-fit: contain; object-position: center; display: block; background: var(--deep); transition: transform 0.6s ease; }
.carousel-slide:hover .carousel-img { transform: scale(1.03); }
.carousel-placeholder { width: 100%; height: 100%; min-height: 400px; display: flex; align-items: center; justify-content: center; background: linear-gradient(160deg, #1a0000 0%, #0a0a0a 60%); }
.carousel-placeholder span { font-family: var(--font-gothic); font-size: 72px; color: rgba(192,57,43,0.12); }
.carousel-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 20px 24px; background: linear-gradient(transparent, rgba(0,0,0,0.85)); }
.carousel-badge { font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.25em; color: var(--white); background: var(--red-deep); border: 1px solid var(--red); padding: 3px 10px; display: inline-block; margin-bottom: 6px; }
.carousel-name { font-family: var(--font-cinzel); font-size: 16px; font-weight: 600; color: var(--white); letter-spacing: 0.05em; }
.carousel-price { font-family: var(--font-cinzel); font-size: 13px; color: var(--off-white); margin-top: 4px; }
.carousel-nav { position: absolute; bottom: 70px; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 12px; z-index: 10; }
.carousel-btn { background: rgba(0,0,0,0.6); border: 1px solid var(--border-red); color: var(--white); width: 36px; height: 36px; font-size: 20px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; line-height: 1; }
.carousel-btn:hover { background: var(--red-deep); border-color: var(--red); }
.carousel-dots { display: flex; gap: 6px; align-items: center; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); border: none; cursor: pointer; transition: all 0.2s; padding: 0; }
.dot.active { background: var(--red-bright); transform: scale(1.4); }
.hero-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(160deg, #1a0000 0%, #0a0a0a 60%, #000 100%); position: relative; overflow: hidden; }
.hero-placeholder-text { font-family: var(--font-gothic); font-size: 72px; color: rgba(192,57,43,0.12); letter-spacing: 0.15em; z-index: 2; }
.hero-placeholder-lines { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-around; }
.hero-line { height: 1px; background: linear-gradient(90deg, transparent, rgba(192,57,43,0.15), transparent); animation: scanline 4s linear infinite; opacity: 0; }
@keyframes scanline { 0% { opacity: 0; transform: translateX(-100%); } 20% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; transform: translateX(100%); } }

/* ─── SECTION / FILTERS ─── */
.section-header { display: flex; justify-content: space-between; align-items: baseline; padding: 60px 40px 30px; border-bottom: 1px solid var(--border); }
.section-title { font-family: var(--font-cinzel); font-weight: 600; font-size: 22px; letter-spacing: 0.12em; color: var(--white); text-transform: uppercase; }
.count { font-family: var(--font-cinzel); color: var(--mid); font-size: 10px; letter-spacing: 0.15em; }
.filters-bar { display: flex; padding: 0 40px; border-bottom: 1px solid var(--border); overflow-x: auto; scrollbar-width: none; align-items: center; }
.filters-bar::-webkit-scrollbar { display: none; }
.filters-clothing { background: var(--deep); border-bottom: 1px solid var(--border-red); }
.filters-collections { background: var(--surface); padding-top: 2px; padding-bottom: 2px; }
.filters-label { font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mid); padding: 0 16px 0 0; white-space: nowrap; flex-shrink: 0; }
.filter-btn { background: none; border: none; border-bottom: 2px solid transparent; padding: 16px 20px; font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mid); cursor: pointer; transition: all 0.2s; white-space: nowrap; margin-bottom: -1px; }
.filter-btn:hover { color: var(--white); }
.filter-btn.active { color: var(--red-bright); border-bottom-color: var(--red-bright); }
.filter-btn-sm { padding: 10px 16px; font-size: 8px; letter-spacing: 0.15em; }
.sort-row { display: flex; justify-content: flex-end; align-items: center; padding: 14px 40px; gap: 12px; border-bottom: 1px solid var(--border); }
.sort-row label { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--mid); }
.sort-row select { background: var(--surface); border: 1px solid var(--border); color: var(--white); font-family: var(--font-body); font-size: 11px; padding: 6px 10px; outline: none; cursor: pointer; }

/* ─── PRODUCT GRID ─── */
.products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1px; background: var(--border); margin: 0 40px 80px; border: 1px solid var(--border); }
.product-card { background: var(--surface); position: relative; overflow: hidden; cursor: pointer; transition: background 0.2s; }
.product-card:hover { background: var(--card); }
.product-card-image { aspect-ratio: 3/4; overflow: hidden; position: relative; background: var(--deep); display: flex; align-items: center; justify-content: center; }
.card-img { width: 100%; height: 100%; object-fit: contain; object-position: center; display: block; transition: transform 0.6s ease; }
.product-card:hover .card-img { transform: scale(1.04); }
.no-img { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(145deg, #1c1c1c, #111); font-family: var(--font-gothic); font-size: 40px; color: rgba(192,57,43,0.15); letter-spacing: 0.15em; }
.card-overlay { position: absolute; inset: 0; background: rgba(120,0,0,0.75); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; }
.product-card:hover .card-overlay { opacity: 1; }
.card-cta { font-family: var(--font-cinzel); font-size: 10px; letter-spacing: 0.25em; color: var(--white); border: 1px solid rgba(255,255,255,0.5); padding: 10px 20px; }
.product-badge { position: absolute; top: 12px; left: 12px; background: var(--deep); color: var(--white); font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; padding: 4px 10px; border: 1px solid var(--border-red); }
.product-badge.sale { background: var(--red-deep); border-color: var(--red); }
.product-info { padding: 18px 20px 22px; }
.product-category { font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--red); margin-bottom: 8px; }
.product-name { font-family: var(--font-cinzel); font-weight: 500; font-size: 14px; line-height: 1.4; color: var(--white); margin-bottom: 8px; }
.product-price { font-size: 14px; color: var(--off-white); letter-spacing: 0.05em; }
.old-price { text-decoration: line-through; color: var(--mid); margin-right: 8px; }
.product-desc { font-size: 11px; color: var(--mid); line-height: 1.6; margin-top: 8px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-clamp: 2; }
.loading-state { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 100px 40px; color: var(--mid); font-family: var(--font-cinzel); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; }
.loading-spinner { width: 36px; height: 36px; border: 2px solid var(--border); border-top-color: var(--red); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 100px 40px; }
.empty-state p { font-family: var(--font-cinzel); font-size: 20px; color: var(--mid); margin-bottom: 24px; }

/* ─── PRODUCT MODAL ─── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 250; display: none; align-items: center; justify-content: center; backdrop-filter: blur(6px); padding: 20px; }
.modal-overlay.open { display: flex; }
.modal-wrapper { position: relative; max-width: 900px; width: 100%; }
.modal { background: var(--deep); border: 1px solid var(--border-red); width: 100%; max-height: 90vh; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; animation: fadeUp 0.3s ease; }
@keyframes fadeUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal-media { position: relative; background: var(--surface); display: flex; align-items: center; justify-content: center; min-height: 400px; overflow: hidden; }
.modal-img { width: 100%; height: 100%; object-fit: contain; object-position: center; display: block; max-height: 600px; }
.modal-img-placeholder { width: 100%; aspect-ratio: 3/4; display: flex; align-items: center; justify-content: center; background: linear-gradient(145deg, #1a0000, #111); font-family: var(--font-gothic); font-size: 52px; color: rgba(192,57,43,0.15); }
.modal-carousel { position: relative; width: 100%; height: 100%; min-height: 400px; overflow: hidden; }
.modal-carousel-track { display: flex; height: 100%; transition: transform 0.4s ease; }
.modal-carousel-img { min-width: 100%; width: 100%; height: 100%; object-fit: contain; object-position: center; display: block; background: var(--deep); }
.modal-carousel-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.7); border: 1px solid var(--border-red); color: var(--white); width: 36px; height: 36px; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; z-index: 5; line-height: 1; }
.modal-carousel-btn.prev { left: 8px; }
.modal-carousel-btn.next { right: 8px; }
.modal-carousel-btn:hover { background: var(--red-deep); border-color: var(--red); }
.modal-dots { position: absolute; bottom: 10px; left: 0; right: 0; display: flex; justify-content: center; gap: 6px; z-index: 5; }
.modal-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.3); cursor: pointer; transition: all 0.2s; }
.modal-dot.active { background: var(--red-bright); transform: scale(1.3); }
.modal-info { padding: 40px 36px; display: flex; flex-direction: column; }
.modal-category { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--red); margin-bottom: 14px; }
.modal-name { font-family: var(--font-cinzel); font-weight: 600; font-size: 22px; line-height: 1.3; color: var(--white); margin-bottom: 18px; }
.modal-price { font-size: 18px; color: var(--off-white); margin-bottom: 24px; letter-spacing: 0.05em; }
.modal-old-price { text-decoration: line-through; color: var(--mid); margin-right: 12px; font-size: 14px; }
.modal-desc { font-size: 12.5px; color: var(--mid); line-height: 1.8; margin-bottom: 24px; flex: 1; }
.modal-thumbs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
.modal-thumb { width: 56px; height: 56px; object-fit: cover; border: 1px solid var(--border); cursor: pointer; transition: border-color 0.2s; opacity: 0.6; }
.modal-thumb.active { border-color: var(--red-bright); opacity: 1; }
.modal-thumb:hover { opacity: 1; }
.btn-buy { width: 100%; text-align: center; padding: 16px; font-size: 10px; letter-spacing: 0.3em; }
.modal-close { position: absolute; top: 16px; right: 16px; background: var(--deep); border: 1px solid var(--border-red); width: 36px; height: 36px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; color: var(--mid); transition: all 0.2s; z-index: 10; }
.modal-close:hover { background: var(--red-deep); color: var(--white); border-color: var(--red); }

/* ─── CHECKOUT MODAL ─── */
.checkout-overlay { z-index: 300; }
.checkout-wrapper { position: relative; max-width: 580px; width: 100%; background: var(--deep); border: 1px solid var(--border-red); max-height: 92vh; overflow-y: auto; animation: fadeUp 0.3s ease; }
.checkout-panel { padding: 48px 40px 40px; }
.checkout-header { margin-bottom: 32px; }
.checkout-step-label { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.25em; color: var(--red); text-transform: uppercase; margin-bottom: 8px; }
.checkout-title { font-family: var(--font-cinzel); font-size: 22px; font-weight: 600; color: var(--white); letter-spacing: 0.08em; margin-bottom: 20px; }
.checkout-product-mini { display: flex; align-items: center; gap: 14px; padding: 14px; background: var(--surface); border: 1px solid var(--border); }
.checkout-product-img { width: 52px; height: 52px; object-fit: cover; border: 1px solid var(--border); }
.checkout-product-name { font-family: var(--font-cinzel); font-size: 12px; color: var(--white); margin-bottom: 4px; }
.checkout-product-price { font-size: 13px; color: var(--red-bright); font-family: var(--font-cinzel); }

/* FORM */
.checkout-form { display: flex; flex-direction: column; gap: 28px; }
.form-section { display: flex; flex-direction: column; gap: 16px; }
.form-section-title { font-family: var(--font-cinzel); font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--red); padding-bottom: 10px; border-bottom: 1px solid var(--border-red); }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--light); }
.form-input { background: var(--surface); border: 1px solid var(--border); color: var(--white); font-family: var(--font-body); font-size: 13px; padding: 10px 14px; outline: none; transition: border-color 0.2s; }
.form-input:focus { border-color: var(--red); }
.form-input.error { border-color: #e74c3c; }
.form-input::placeholder { color: var(--mid); }
.form-error { font-size: 10px; color: #e74c3c; letter-spacing: 0.05em; }
.form-hint { font-size: 11px; color: var(--mid); line-height: 1.6; }
.form-link { color: var(--red-bright); text-decoration: underline; }

/* DELIVERY OPTIONS */
.delivery-options { display: flex; flex-direction: column; gap: 10px; }
.delivery-option { display: flex; align-items: flex-start; gap: 12px; padding: 14px; border: 1px solid var(--border); cursor: pointer; transition: all 0.2s; }
.delivery-option.active { border-color: var(--red); background: rgba(192,57,43,0.06); }
.delivery-option:hover { border-color: var(--border-red); }
.delivery-radio { margin-top: 2px; accent-color: var(--red-bright); }
.delivery-option-name { font-family: var(--font-cinzel); font-size: 12px; color: var(--white); margin-bottom: 3px; }
.delivery-option-desc { font-size: 11px; color: var(--mid); }

/* TABS */
.delivery-type-tabs { display: flex; gap: 0; margin-bottom: 16px; }
.tab-btn { flex: 1; padding: 10px; font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; background: none; border: 1px solid var(--border); color: var(--mid); cursor: pointer; transition: all 0.2s; }
.tab-btn:first-child { border-right: none; }
.tab-btn.active { background: var(--red-deep); border-color: var(--red); color: var(--white); }

/* OFERTA */
.oferta-section { padding-top: 4px; }
.oferta-label { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; }
.oferta-label.error .oferta-text { color: #e74c3c; }
.oferta-checkbox { margin-top: 2px; width: 16px; height: 16px; accent-color: var(--red-bright); flex-shrink: 0; }
.oferta-text { font-size: 12px; color: var(--light); line-height: 1.6; }
.btn-checkout-next { width: 100%; text-align: center; padding: 16px; font-size: 10px; letter-spacing: 0.25em; }

/* ORDER SUMMARY */
.order-summary { background: var(--surface); border: 1px solid var(--border); padding: 20px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 12px; }
.summary-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--light); }
.summary-row span:last-child { color: var(--off-white); text-align: right; max-width: 60%; }
.summary-row.total { padding-top: 12px; border-top: 1px solid var(--border-red); font-family: var(--font-cinzel); font-size: 15px; }
.summary-row.total span { color: var(--white); font-weight: 600; }
.payment-note { font-size: 11px; color: var(--mid); line-height: 1.7; margin-bottom: 24px; padding: 14px; border-left: 2px solid var(--border-red); }
.payment-error { background: rgba(231,76,60,0.12); border: 1px solid var(--red); color: var(--red-bright); padding: 12px 16px; font-size: 12px; margin-bottom: 20px; }
.checkout-actions { display: flex; gap: 12px; }
.btn-back { background: none; border: 1px solid var(--border); color: var(--mid); padding: 14px 24px; font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.btn-back:hover { border-color: var(--white); color: var(--white); }
.btn-pay { flex: 1; text-align: center; padding: 16px; font-size: 10px; letter-spacing: 0.2em; display: flex; align-items: center; justify-content: center; gap: 10px; }
.btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: var(--white); border-radius: 50%; animation: spin 0.7s linear infinite; }

@media (max-width: 900px) {
  .hero { grid-template-columns: 1fr; }
  .hero-carousel { min-height: 60vw; }
  .products-grid { margin: 0 20px 40px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
  .section-header, .filters-bar, .sort-row { padding-left: 20px; padding-right: 20px; }
  .modal { grid-template-columns: 1fr; }
  .modal-img { max-height: 300px; }
  .checkout-panel { padding: 40px 24px 32px; }
}

/* ─── СДЭК ВИДЖЕТ ─── */
.cdek-overlay { z-index: 400; }
.cdek-modal-wrapper { position: relative; width: 95vw; max-width: 1100px; height: 85vh; background: var(--deep); border: 1px solid var(--border-red); display: flex; flex-direction: column; animation: fadeUp 0.3s ease; }
.cdek-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-red); flex-shrink: 0; }
.cdek-modal-title { font-family: var(--font-cinzel); font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--white); }
.cdek-map-container { flex: 1; overflow: hidden; }
.cdek-map-container > * { width: 100% !important; height: 100% !important; }
.btn-cdek-widget { width: 100%; padding: 12px 16px; background: var(--red-deep); border: 1px solid var(--red); color: var(--white); font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; }
.btn-cdek-widget:hover { background: var(--red); box-shadow: 0 0 20px var(--red-glow); }
.cdek-icon { font-size: 16px; }
.cdek-selected { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; background: rgba(192,57,43,0.08); border: 1px solid var(--red); margin-top: 10px; }
.cdek-selected-icon { color: #2ecc71; font-size: 16px; flex-shrink: 0; margin-top: 1px; }
.cdek-selected-title { font-family: var(--font-cinzel); font-size: 10px; letter-spacing: 0.1em; color: var(--red-bright); margin-bottom: 4px; }
.cdek-selected-addr { font-size: 12px; color: var(--light); line-height: 1.5; }
.delivery-calculating { color: var(--mid); font-style: italic; font-size: 12px; }

</style>
