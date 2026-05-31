<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Массовые акции</h2>
      <button class="new-btn" @click="openNew">+ Новая акция</button>
    </div>

    <!-- СПИСОК АКЦИЙ -->
    <div v-if="loading" class="loading">Загрузка...</div>

    <div v-else-if="discounts.length === 0" class="empty-box">
      Пока нет ни одной акции. Создай первую: например, «-20% на все худи».
    </div>

    <div v-else class="discount-list">
      <div
        v-for="d in discounts"
        :key="d.id"
        class="discount-card"
        :class="{ active: d.active, disabled: !d.enabled }"
      >
        <div class="discount-head">
          <div class="discount-name">{{ d.name }}</div>
          <div class="discount-percent">−{{ d.percent }}%</div>
        </div>
        <div class="discount-meta">
          <span class="meta-tag">{{ filterLabel(d.filter) }}</span>
          <span v-if="d.startDate || d.endDate" class="meta-tag">
            {{ dateRangeLabel(d) }}
          </span>
          <span class="meta-tag status" :class="statusClass(d)">{{ statusLabel(d) }}</span>
        </div>
        <div class="discount-actions">
          <button class="btn-secondary" @click="toggle(d)">
            {{ d.enabled ? 'Отключить' : 'Включить' }}
          </button>
          <button class="btn-secondary" @click="openEdit(d)">Изменить</button>
          <button class="btn-danger" @click="remove(d)">Удалить</button>
        </div>
      </div>
    </div>

    <!-- МОДАЛКА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ -->
    <Teleport to="body">
      <div class="modal-overlay" :class="{ open: modalOpen }" @click.self="closeModal">
        <div class="discount-modal">
          <div class="modal-head">
            <span>{{ editingId ? 'Редактировать акцию' : 'Новая акция' }}</span>
            <button class="modal-close" @click="closeModal">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Название *</label>
              <input v-model="form.name" placeholder="Зимняя распродажа">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Скидка (%) *</label>
                <input v-model="form.percent" type="number" min="1" max="90" placeholder="20">
              </div>
              <div class="form-group">
                <label>Включена</label>
                <button
                  type="button"
                  class="toggle-btn"
                  :class="{ on: form.enabled }"
                  @click="form.enabled = !form.enabled"
                >{{ form.enabled ? 'ВКЛ' : 'ВЫКЛ' }}</button>
              </div>
            </div>

            <div class="form-group">
              <label>Применить к</label>
              <select v-model="form.filterType" @change="onFilterTypeChange">
                <option value="all">Все товары</option>
                <option value="category">Коллекция</option>
                <option value="clothingType">Тип одежды</option>
              </select>
            </div>

            <div v-if="form.filterType === 'category'" class="form-group">
              <label>Коллекция</label>
              <select v-model="form.filterValue">
                <option value="">— выбрать —</option>
                <option v-for="c in collections" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>

            <div v-if="form.filterType === 'clothingType'" class="form-group">
              <label>Тип одежды</label>
              <select v-model="form.filterValue">
                <option value="">— выбрать —</option>
                <option value="hoodie">Худи</option>
                <option value="tshirt">Футболки</option>
                <option value="longsleeve">Лонгсливы</option>
                <option value="jacket">Куртки</option>
                <option value="pants">Штаны</option>
                <option value="accessories">Аксессуары</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Начало (необязательно)</label>
                <input v-model="form.startDate" type="datetime-local">
              </div>
              <div class="form-group">
                <label>Конец (необязательно)</label>
                <input v-model="form.endDate" type="datetime-local">
              </div>
            </div>

            <div class="preview-box">
              <button type="button" class="preview-btn" @click="loadPreview">Показать товары под акцию</button>
              <div v-if="preview" class="preview-result">
                <span class="preview-count">Затронуто товаров: <b>{{ preview.count }}</b></span>
                <div v-if="preview.sample.length" class="preview-sample">
                  <div v-for="s in preview.sample" :key="s.id" class="preview-item">
                    {{ s.name }} — {{ s.basePrice }} ₽ → {{ Math.round(s.basePrice * (1 - Number(form.percent || 0)/100)) }} ₽
                  </div>
                  <div v-if="preview.count > preview.sample.length" class="preview-more">
                    ...и ещё {{ preview.count - preview.sample.length }}
                  </div>
                </div>
              </div>
            </div>

            <div v-if="errorMsg" class="form-error">{{ errorMsg }}</div>
          </div>
          <div class="modal-foot">
            <button class="btn-primary" :disabled="submitting" @click="save">
              {{ submitting ? 'Сохранение...' : (editingId ? 'Сохранить' : 'Создать акцию') }}
            </button>
            <button class="btn-secondary" @click="closeModal">Отмена</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const config = useRuntimeConfig()
const API_BASE = config.public.apiBase
const getToken = () => localStorage.getItem('admin_token') || ''

interface DiscountFilter { type: 'all' | 'category' | 'clothingType' | 'collection'; value: string }
interface Discount {
  id: number
  name: string
  percent: number
  filter: DiscountFilter
  startDate: string | null
  endDate: string | null
  enabled: boolean
  active?: boolean
}

const loading = ref(true)
const discounts = ref<Discount[]>([])
const collections = ref<string[]>([])

const modalOpen = ref(false)
const editingId = ref<number | null>(null)
const submitting = ref(false)
const errorMsg = ref('')

const form = reactive({
  name: '',
  percent: '20',
  filterType: 'all' as 'all' | 'category' | 'clothingType',
  filterValue: '',
  startDate: '',
  endDate: '',
  enabled: true,
})

const preview = ref<{ count: number; sample: any[] } | null>(null)

const CLOTHING: Record<string, string> = {
  hoodie: 'Худи', tshirt: 'Футболки', longsleeve: 'Лонгсливы',
  jacket: 'Куртки', pants: 'Штаны', accessories: 'Аксессуары',
}

const filterLabel = (f: DiscountFilter): string => {
  if (!f) return 'Все товары'
  if (f.type === 'all') return 'Все товары'
  if (f.type === 'category' || f.type === 'collection') return `Коллекция: ${f.value}`
  if (f.type === 'clothingType') return `Тип: ${CLOTHING[f.value] || f.value}`
  return 'Все товары'
}

const fmtDate = (iso: string | null): string => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('ru', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const dateRangeLabel = (d: Discount): string => {
  const a = fmtDate(d.startDate)
  const b = fmtDate(d.endDate)
  if (a && b) return `${a} — ${b}`
  if (a) return `с ${a}`
  if (b) return `до ${b}`
  return ''
}

const statusLabel = (d: Discount): string => {
  if (!d.enabled) return 'Отключена'
  if (d.active)   return 'Активна'
  return 'Не активна'
}
const statusClass = (d: Discount): string => {
  if (!d.enabled) return 'off'
  if (d.active)   return 'on'
  return 'idle'
}

const toLocalInput = (iso: string | null): string => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fromLocalInput = (s: string): string | null => {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

const fetchAll = async () => {
  loading.value = true
  try {
    const [dr, cr] = await Promise.all([
      fetch(`${API_BASE}/api/admin/discounts`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API_BASE}/api/collections`),
    ])
    discounts.value = await dr.json()
    collections.value = await cr.json()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.name = ''
  form.percent = '20'
  form.filterType = 'all'
  form.filterValue = ''
  form.startDate = ''
  form.endDate = ''
  form.enabled = true
  preview.value = null
  errorMsg.value = ''
}

const openNew = () => {
  editingId.value = null
  resetForm()
  modalOpen.value = true
}

const openEdit = (d: Discount) => {
  editingId.value = d.id
  form.name = d.name
  form.percent = String(d.percent)
  form.filterType = (d.filter?.type === 'collection' ? 'category' : (d.filter?.type as any)) || 'all'
  form.filterValue = d.filter?.value || ''
  form.startDate = toLocalInput(d.startDate)
  form.endDate = toLocalInput(d.endDate)
  form.enabled = d.enabled !== false
  preview.value = null
  errorMsg.value = ''
  modalOpen.value = true
}

const closeModal = () => {
  modalOpen.value = false
  editingId.value = null
}

const onFilterTypeChange = () => {
  form.filterValue = ''
  preview.value = null
}

const buildPayload = () => ({
  name: form.name.trim(),
  percent: Number(form.percent) || 0,
  filter: { type: form.filterType, value: form.filterValue },
  startDate: fromLocalInput(form.startDate),
  endDate: fromLocalInput(form.endDate),
  enabled: form.enabled,
})

const loadPreview = async () => {
  errorMsg.value = ''
  if (!form.percent || Number(form.percent) <= 0) {
    errorMsg.value = 'Укажите процент скидки'
    return
  }
  try {
    const res = await fetch(`${API_BASE}/api/admin/discounts/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(buildPayload()),
    })
    if (!res.ok) throw new Error('preview failed')
    preview.value = await res.json()
  } catch (e: any) {
    errorMsg.value = e?.message || 'Ошибка превью'
  }
}

const save = async () => {
  errorMsg.value = ''
  if (!form.name.trim()) { errorMsg.value = 'Введите название'; return }
  const pct = Number(form.percent)
  if (!pct || pct <= 0 || pct > 90) { errorMsg.value = 'Процент: 1..90'; return }
  if ((form.filterType === 'category' || form.filterType === 'clothingType') && !form.filterValue) {
    errorMsg.value = 'Выберите фильтр'
    return
  }
  submitting.value = true
  try {
    const url = editingId.value
      ? `${API_BASE}/api/admin/discounts/${editingId.value}`
      : `${API_BASE}/api/admin/discounts`
    const method = editingId.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(buildPayload()),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    closeModal()
    await fetchAll()
  } catch (e: any) {
    errorMsg.value = e?.message || 'Ошибка сохранения'
  } finally {
    submitting.value = false
  }
}

const toggle = async (d: Discount) => {
  try {
    await fetch(`${API_BASE}/api/admin/discounts/${d.id}/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    await fetchAll()
  } catch {}
}

const remove = async (d: Discount) => {
  if (!confirm(`Удалить акцию «${d.name}»? Цены вернутся к базовым.`)) return
  try {
    await fetch(`${API_BASE}/api/admin/discounts/${d.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    await fetchAll()
  } catch {}
}

onMounted(fetchAll)
</script>

<style scoped>
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.page-title { font-family: var(--font-cinzel); font-size: 16px; letter-spacing: 0.2em; color: var(--white); text-transform: uppercase; }
.new-btn { background: var(--red-deep); border: 1px solid var(--red); color: var(--white); font-family: var(--font-cinzel); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; padding: 10px 18px; cursor: pointer; transition: all 0.2s; }
.new-btn:hover { background: var(--red); box-shadow: 0 0 18px var(--red-glow); }

.loading, .empty-box { background: var(--deep); border: 1px solid var(--border); padding: 40px; text-align: center; font-family: var(--font-cinzel); font-size: 11px; letter-spacing: 0.15em; color: var(--mid); }

.discount-list { display: grid; gap: 14px; }
.discount-card { background: var(--deep); border: 1px solid var(--border); padding: 18px 22px; transition: border-color 0.2s; }
.discount-card.active { border-color: var(--red); }
.discount-card.disabled { opacity: 0.55; }
.discount-head { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; margin-bottom: 10px; }
.discount-name { font-family: var(--font-cinzel); font-size: 14px; letter-spacing: 0.12em; color: var(--white); text-transform: uppercase; }
.discount-percent { font-family: var(--font-gothic); font-size: 26px; color: var(--red-bright); text-shadow: 0 0 14px var(--red-glow); }
.discount-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.meta-tag { font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mid); background: var(--surface); border: 1px solid var(--border); padding: 4px 9px; }
.meta-tag.status.on  { color: #2ecc71; border-color: #2ecc71; }
.meta-tag.status.off { color: var(--mid); }
.meta-tag.status.idle { color: var(--red-bright); border-color: var(--border-red); }

.discount-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-primary, .btn-secondary, .btn-danger {
  font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.18em;
  text-transform: uppercase; padding: 9px 16px; cursor: pointer; transition: all 0.2s;
}
.btn-primary { background: var(--red-deep); border: 1px solid var(--red); color: var(--white); flex: 1; }
.btn-primary:hover:not(:disabled) { background: var(--red); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: none; border: 1px solid var(--border); color: var(--off-white); }
.btn-secondary:hover { border-color: var(--red); color: var(--white); }
.btn-danger { background: none; border: 1px solid var(--border-red); color: var(--red-bright); }
.btn-danger:hover { background: var(--red-deep); color: var(--white); }

/* MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 500; display: none; align-items: center; justify-content: center; backdrop-filter: blur(4px); padding: 20px; }
.modal-overlay.open { display: flex; }
.discount-modal { background: var(--deep); border: 1px solid var(--border-red); width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; }
.modal-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid var(--border); font-family: var(--font-cinzel); font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--white); }
.modal-close { background: none; border: none; color: var(--mid); font-size: 16px; cursor: pointer; }
.modal-close:hover { color: var(--white); }
.modal-body { padding: 24px; }
.modal-foot { display: flex; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border); }

.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mid); margin-bottom: 8px; }
.form-group input, .form-group select { width: 100%; background: var(--surface); border: 1px solid var(--border); color: var(--white); padding: 11px 13px; font-family: var(--font-body); font-size: 13px; outline: none; transition: border-color 0.2s; }
.form-group input:focus, .form-group select:focus { border-color: var(--red); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

.toggle-btn { background: var(--surface); border: 1px solid var(--border); color: var(--mid); padding: 11px 14px; font-family: var(--font-cinzel); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; width: 100%; transition: all 0.2s; }
.toggle-btn.on { background: var(--red-deep); border-color: var(--red); color: var(--white); }

.preview-box { margin-top: 6px; padding: 14px; border: 1px dashed var(--border); }
.preview-btn { background: none; border: 1px solid var(--border-red); color: var(--red-bright); font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; padding: 8px 14px; cursor: pointer; }
.preview-btn:hover { background: var(--red-deep); color: var(--white); }
.preview-result { margin-top: 12px; font-family: var(--font-body); }
.preview-count { font-family: var(--font-cinzel); font-size: 10px; letter-spacing: 0.15em; color: var(--off-white); text-transform: uppercase; }
.preview-sample { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
.preview-item { font-size: 12px; color: var(--mid); }
.preview-more { font-size: 11px; color: var(--mid); opacity: 0.6; margin-top: 4px; }

.form-error { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.12em; color: var(--red-bright); margin-top: 16px; padding: 12px 14px; border: 1px solid var(--red-deep); background: rgba(120,0,0,0.1); }

@media (max-width: 600px) {
  .form-row { grid-template-columns: 1fr; }
  .discount-head { flex-direction: column; align-items: flex-start; }
}
</style>
