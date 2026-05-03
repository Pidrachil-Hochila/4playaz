<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">РАБОТА СЕНИ</h2>
      <div class="header-actions">
        <div class="filter-toggle">
          <button class="toggle-btn" :class="{ active: filter === 'all' }" @click="setFilter('all')">Все ({{ totalCount }})</button>
          <button class="toggle-btn" :class="{ active: filter === 'pending' }" @click="setFilter('pending')">Ожидают ссылку ({{ pendingCount }})</button>
        </div>
        <button class="refresh-btn" @click="fetchOrders" :disabled="loading">↻ Обновить</button>
      </div>
    </div>

    <div v-if="loading" class="state-msg">Загрузка...</div>

    <div v-else-if="error" class="state-msg state-error">{{ error }}</div>

    <div v-else-if="visibleOrders.length === 0" class="state-msg">
      {{ filter === 'pending' ? 'Нет заказов, ожидающих ссылку на оплату' : 'Нет заказов в Supabase' }}
    </div>

    <div v-else class="orders-list">
      <div
        class="order-item"
        v-for="order in visibleOrders"
        :key="order.id"
        :class="{ 'is-paid': order.status === 'paid', 'is-sent': order.link_sent && order.status !== 'paid' }"
      >
        <div class="order-info">
          <div class="order-top">
            <span class="order-id">#{{ order.id }}</span>
            <span class="status-badge" :class="`badge-${statusKind(order)}`">{{ statusLabel(order) }}</span>
          </div>
          <div class="order-name">{{ order.full_name || '—' }}</div>
          <div class="order-contacts">
            <span v-if="order.phone" class="order-phone">📞 {{ order.phone }}</span>
            <span v-if="order.email" class="order-email">✉ {{ order.email }}</span>
            <span v-if="order.telegram" class="order-tg">✈ {{ order.telegram }}</span>
          </div>
          <div class="order-product">{{ order.product_name }}</div>
          <div class="order-price">
            {{ fmtPrice(order.product_price) }}
            <span v-if="order.delivery_price > 0"> + {{ fmtPrice(order.delivery_price) }} доставка</span>
          </div>
          <div v-if="order.delivery_method" class="order-meta">
            {{ order.delivery_method }}<span v-if="order.delivery_address"> · {{ order.delivery_address }}</span>
          </div>
          <div class="order-date">{{ fmtDate(order.created_at) }}</div>
        </div>
        <div class="order-actions">
          <button
            v-if="order.status !== 'paid'"
            class="send-btn"
            :class="{ 'send-btn-resend': order.link_sent }"
            @click="openModal(order)"
          >
            {{ order.link_sent ? 'Переотправить' : 'Отправить ссылку' }}
          </button>
          <span v-else class="paid-mark">Оплачено</span>
        </div>
      </div>
    </div>

    <!-- MODAL -->
    <Teleport to="body">
      <div class="modal-overlay" :class="{ open: modalOpen }" @click.self="closeModal">
        <div class="modal-box">
          <button class="modal-close" @click="closeModal">✕</button>
          <div class="modal-header">
            <div class="modal-label">ОТПРАВКА ССЫЛКИ</div>
            <div class="modal-customer" v-if="activeOrder">
              {{ activeOrder.full_name }} · {{ activeOrder.phone }}{{ activeOrder.telegram ? ` · ${activeOrder.telegram}` : '' }}
            </div>
            <div class="modal-product" v-if="activeOrder">{{ activeOrder.product_name }}</div>
            <div class="modal-amounts" v-if="activeOrder">
              <span>Товар: {{ fmtPrice(activeOrder.product_price) }}</span>
              <span class="amounts-sep">·</span>
              <span class="amounts-total">Итого: {{ fmtPrice((activeOrder.product_price || 0) + (Number(deliveryInput) || 0)) }}</span>
            </div>
          </div>

          <div class="modal-body">
            <div class="modal-fields">
              <div class="field-group">
                <label class="field-label">Сумма доставки (₽)</label>
                <input
                  v-model="deliveryInput"
                  type="number"
                  min="0"
                  class="link-input"
                  :class="{ error: deliveryError }"
                  placeholder="0"
                >
                <span v-if="deliveryError" class="field-error">{{ deliveryError }}</span>
              </div>
              <div class="field-group">
                <label class="field-label">Ссылка на оплату</label>
                <input
                  v-model="linkInput"
                  type="url"
                  class="link-input"
                  :class="{ error: linkError }"
                  placeholder="https://..."
                  @keydown.enter="submitLink"
                >
                <span v-if="linkError" class="field-error">{{ linkError }}</span>
              </div>
            </div>
          </div>

          <div v-if="sendError" class="send-error">{{ sendError }}</div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="closeModal">Отмена</button>
            <button class="btn-send" :disabled="sending" @click="submitLink">
              <span v-if="sending" class="spinner"></span>
              {{ sending ? 'Отправка...' : 'Отправить' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminApi } from '~/composables/useApi'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const { getOrders, sendPaymentLink } = useAdminApi()

const orders = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const filter = ref<'all' | 'pending'>('pending')

const modalOpen = ref(false)
const activeOrder = ref<any>(null)
const linkInput = ref('')
const linkError = ref('')
const deliveryInput = ref('')
const deliveryError = ref('')
const sending = ref(false)
const sendError = ref('')

const isPending = (o: any) => !o.link_sent && o.status !== 'paid'

const totalCount = computed(() => orders.value.length)
const pendingCount = computed(() => orders.value.filter(isPending).length)

const visibleOrders = computed(() => {
  if (filter.value === 'pending') return orders.value.filter(isPending)
  return orders.value
})

const setFilter = (f: 'all' | 'pending') => { filter.value = f }

const statusKind = (o: any): 'paid' | 'sent' | 'wait' => {
  if (o.status === 'paid') return 'paid'
  if (o.link_sent) return 'sent'
  return 'wait'
}

const statusLabel = (o: any) => {
  const kind = statusKind(o)
  if (kind === 'paid') return 'Оплачено'
  if (kind === 'sent') return 'Ссылка отправлена'
  return 'Ждёт ссылку'
}

const fetchOrders = async () => {
  loading.value = true
  error.value = ''
  try {
    orders.value = await getOrders(false) as any[]
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Не удалось загрузить заказы'
  } finally {
    loading.value = false
  }
}

const openModal = (order: any) => {
  activeOrder.value = order
  linkInput.value = ''
  linkError.value = ''
  deliveryInput.value = String(Number(order.delivery_price) || '')
  deliveryError.value = ''
  sendError.value = ''
  modalOpen.value = true
}

const closeModal = () => {
  if (sending.value) return
  modalOpen.value = false
  activeOrder.value = null
}

const submitLink = async () => {
  linkError.value = ''
  deliveryError.value = ''
  sendError.value = ''

  const url = linkInput.value.trim()
  const delivery = Number(deliveryInput.value)

  if (isNaN(delivery) || delivery < 0) { deliveryError.value = 'Введите корректную сумму'; return }
  if (!url) { linkError.value = 'Введите ссылку'; return }
  if (!/^https?:\/\/.+/.test(url)) { linkError.value = 'Некорректный URL'; return }

  sending.value = true
  try {
    await sendPaymentLink(activeOrder.value.id, url, delivery)
    const idx = orders.value.findIndex(o => o.id === activeOrder.value.id)
    if (idx !== -1) {
      orders.value[idx] = {
        ...orders.value[idx],
        link_sent: true,
        status: orders.value[idx].status === 'paid' ? 'paid' : 'send',
        delivery_price: delivery,
      }
    }
    modalOpen.value = false
    activeOrder.value = null
  } catch (err: any) {
    sendError.value = err?.data?.message || 'Ошибка при отправке. Попробуйте снова.'
  } finally {
    sending.value = false
  }
}

const fmtPrice = (v: number) => Number(v || 0).toLocaleString('ru') + ' ₽'
const fmtDate = (iso: string) => {
  if (!iso) return ''
  return new Date(iso).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(fetchOrders)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  gap: 16px;
  flex-wrap: wrap;
}
.page-title {
  font-family: var(--font-cinzel);
  font-size: 16px;
  letter-spacing: 0.2em;
  color: var(--white);
  text-transform: uppercase;
}
.header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.filter-toggle { display: flex; border: 1px solid var(--border); }
.toggle-btn {
  background: none;
  border: none;
  color: var(--mid);
  padding: 8px 14px;
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}
.toggle-btn + .toggle-btn { border-left: 1px solid var(--border); }
.toggle-btn.active { background: var(--red-deep); color: var(--white); }
.toggle-btn:hover:not(.active) { color: var(--white); }
.refresh-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--mid);
  padding: 8px 18px;
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}
.refresh-btn:hover:not(:disabled) { border-color: var(--red); color: var(--red-bright); }
.refresh-btn:disabled { opacity: 0.4; cursor: default; }

.state-msg {
  text-align: center;
  padding: 60px;
  font-family: var(--font-cinzel);
  font-size: 12px;
  color: var(--mid);
  letter-spacing: 0.15em;
}
.state-error { color: var(--red-bright); }

/* ─── LIST ─── */
.orders-list { display: flex; flex-direction: column; gap: 12px; }
.order-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  background: var(--deep);
  border: 1px solid var(--border);
  padding: 18px 20px;
  transition: border-color 0.2s;
}
.order-item:hover { border-color: var(--border-red); }

.order-item.is-paid { opacity: 0.55; }
.order-item.is-sent { border-color: rgba(192,57,43,0.4); }

.order-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.order-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.order-id {
  font-family: var(--font-cinzel);
  font-size: 9px;
  color: var(--red);
  letter-spacing: 0.2em;
}
.status-badge {
  display: inline-block;
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 3px 8px;
  border: 1px solid;
}
.badge-wait { color: var(--red-bright); border-color: var(--red); background: rgba(192,57,43,0.08); }
.badge-sent { color: #e6c87a; border-color: #b08a30; background: rgba(176,138,48,0.08); }
.badge-paid { color: #6ad28a; border-color: #2f7a44; background: rgba(47,122,68,0.10); }

.order-name {
  font-family: var(--font-cinzel);
  font-size: 13px;
  color: var(--white);
}
.order-contacts { display: flex; gap: 12px; flex-wrap: wrap; margin: 2px 0; }
.order-phone { font-size: 12px; color: var(--off-white); }
.order-email { font-size: 12px; color: var(--off-white); }
.order-tg { font-size: 12px; color: var(--red-bright); }
.order-product {
  font-size: 11px;
  color: var(--off-white);
  margin-top: 2px;
}
.order-price { font-size: 12px; color: var(--off-white); }
.order-meta { font-size: 11px; color: var(--mid); }
.order-date { font-size: 10px; color: var(--mid); margin-top: 4px; letter-spacing: 0.05em; }

.order-actions { flex-shrink: 0; padding-top: 2px; display: flex; align-items: center; }
.send-btn {
  background: var(--red-deep);
  border: 1px solid var(--red);
  color: var(--white);
  padding: 10px 20px;
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.send-btn:hover { background: var(--red); }
.send-btn-resend { background: transparent; color: var(--red-bright); }
.send-btn-resend:hover { background: var(--red-deep); color: var(--white); }
.paid-mark {
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: #6ad28a;
  text-transform: uppercase;
  padding: 10px 18px;
  border: 1px solid #2f7a44;
}

/* ─── MODAL ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
.modal-overlay.open { opacity: 1; pointer-events: all; }

.modal-box {
  background: var(--deep);
  border: 1px solid var(--border-red);
  border-top: 3px solid var(--red);
  width: 480px;
  max-width: calc(100vw - 40px);
  position: relative;
  padding: 32px;
}
.modal-close {
  position: absolute;
  top: 14px; right: 16px;
  background: none;
  border: none;
  color: var(--mid);
  font-size: 16px;
  cursor: pointer;
  transition: color 0.2s;
}
.modal-close:hover { color: var(--white); }

.modal-header { margin-bottom: 24px; }
.modal-label {
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.3em;
  color: var(--red);
  margin-bottom: 8px;
}
.modal-customer {
  font-family: var(--font-cinzel);
  font-size: 14px;
  color: var(--white);
  margin-bottom: 4px;
}
.modal-product { font-size: 12px; color: var(--mid); }
.modal-amounts { margin-top: 8px; font-size: 11px; color: var(--mid); display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.amounts-sep { color: var(--border-red); }
.amounts-total { color: var(--off-white); font-family: var(--font-cinzel); letter-spacing: 0.05em; }

.modal-body { margin-bottom: 20px; }
.modal-fields { display: flex; flex-direction: column; gap: 16px; }
.field-group { display: flex; flex-direction: column; }
.field-label {
  display: block;
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--mid);
  text-transform: uppercase;
  margin-bottom: 8px;
}
.link-input {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--white);
  padding: 12px 14px;
  font-size: 13px;
  font-family: monospace;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.link-input:focus { border-color: var(--red); }
.link-input.error { border-color: var(--red-bright); }
.field-error {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: var(--red-bright);
}

.send-error {
  font-size: 12px;
  color: var(--red-bright);
  margin-bottom: 16px;
  padding: 10px 14px;
  background: rgba(192,57,43,0.08);
  border-left: 3px solid var(--red);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.btn-cancel {
  background: none;
  border: 1px solid var(--border);
  color: var(--mid);
  padding: 10px 20px;
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel:hover { border-color: var(--red); color: var(--red-bright); }

.btn-send {
  background: var(--red-deep);
  border: 1px solid var(--red);
  color: var(--white);
  padding: 10px 28px;
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-send:hover:not(:disabled) { background: var(--red); }
.btn-send:disabled { opacity: 0.5; cursor: default; }

.spinner {
  width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .page-header { margin-bottom: 14px; gap: 10px; }
  .page-title { font-size: 11px; letter-spacing: 0.12em; }
  .header-actions { gap: 8px; width: 100%; }
  .toggle-btn { padding: 7px 10px; font-size: 8px; }
  .refresh-btn { padding: 7px 12px; font-size: 8px; }
  .order-item { flex-direction: column; gap: 10px; padding: 12px 14px; }
  .order-actions { width: 100%; }
  .send-btn, .paid-mark { width: 100%; text-align: center; padding: 10px; }
  .order-name { font-size: 12px; }
  .order-phone, .order-email, .order-tg { font-size: 11px; }
}
</style>
