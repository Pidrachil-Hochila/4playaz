<template>
  <div>
    <!-- HEADER ROW -->
      <div class="page-header">
        <div>
          <h1 class="page-title">ПРОМОКОДЫ</h1>
          <p class="page-sub">Управление скидочными кодами</p>
        </div>
        <button class="btn-add" @click="openCreateForm">
          <span>⊕</span> Новый промокод
        </button>
      </div>

      <!-- STATS -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-val">{{ discounts.length }}</div>
          <div class="stat-label">Всего кодов</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ discounts.filter(d => d.active).length }}</div>
          <div class="stat-label">Активных</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ discounts.reduce((s, d) => s + (d.usedCount || 0), 0) }}</div>
          <div class="stat-label">Применений</div>
        </div>
      </div>

      <!-- ERROR -->
      <div v-if="loadError" class="error-banner">{{ loadError }}</div>

      <!-- TABLE -->
      <div class="table-wrap" v-if="discounts.length > 0">
        <table class="disc-table">
          <thead>
            <tr>
              <th>Код</th>
              <th>Тип</th>
              <th>Значение</th>
              <th>Мин. заказ</th>
              <th>Использований</th>
              <th>Действует до</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in discounts" :key="d.code" :class="{ inactive: !d.active }">
              <td class="code-cell">{{ d.code }}</td>
              <td>
                <span class="type-badge" :class="d.type">
                  {{ d.type === 'percent' ? '%' : '₽' }}
                </span>
              </td>
              <td class="value-cell">
                {{ d.type === 'percent' ? d.value + '%' : d.value.toLocaleString('ru') + ' ₽' }}
              </td>
              <td>{{ d.minOrder > 0 ? d.minOrder.toLocaleString('ru') + ' ₽' : '—' }}</td>
              <td>
                <span class="uses-cell">
                  {{ d.usedCount || 0 }}
                  <span v-if="d.maxUses > 0" class="uses-max"> / {{ d.maxUses }}</span>
                </span>
              </td>
              <td>
                <span v-if="d.expiresAt" :class="{ expired: isExpired(d.expiresAt) }">
                  {{ formatDate(d.expiresAt) }}
                </span>
                <span v-else class="no-limit">∞</span>
              </td>
              <td>
                <button
                  class="status-toggle"
                  :class="{ active: d.active }"
                  @click="toggleActive(d)"
                  :title="d.active ? 'Деактивировать' : 'Активировать'"
                >
                  {{ d.active ? 'Активен' : 'Выкл.' }}
                </button>
              </td>
              <td class="actions-cell">
                <button class="btn-icon" title="Редактировать" @click="openEditForm(d)">✎</button>
                <button class="btn-icon danger" title="Удалить" @click="confirmDelete(d.code)">✕</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- EMPTY STATE -->
      <div v-else-if="!loading" class="empty-state">
        <div class="empty-icon">%</div>
        <p class="empty-title">Промокодов пока нет</p>
        <p class="empty-sub">Создайте первый промокод для ваших покупателей</p>
        <button class="btn-add" @click="openCreateForm">⊕ Создать промокод</button>
      </div>

      <div v-if="loading" class="loading-state">Загрузка...</div>

      <!-- ═══ MODAL: CREATE / EDIT ═══ -->
      <Teleport to="body">
        <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
          <div class="modal">
            <div class="modal-header">
              <h2 class="modal-title">{{ editingCode ? 'Редактировать промокод' : 'Новый промокод' }}</h2>
              <button class="modal-close" @click="closeForm">✕</button>
            </div>

            <div class="modal-body">
              <div class="form-grid">

                <!-- КОД -->
                <div class="form-group full" v-if="!editingCode">
                  <label class="form-label">Промокод *</label>
                  <input
                    v-model="form.code"
                    type="text"
                    class="form-input"
                    :class="{ error: formErrors.code }"
                    placeholder="SUMMER20"
                    @input="form.code = form.code.toUpperCase().replace(/[^A-Z0-9_-]/g, '')"
                  >
                  <span v-if="formErrors.code" class="form-error">{{ formErrors.code }}</span>
                  <span class="form-hint">Только буквы A–Z, цифры, _ и -</span>
                </div>

                <div v-if="editingCode" class="form-group full">
                  <label class="form-label">Промокод</label>
                  <div class="code-display">{{ editingCode }}</div>
                </div>

                <!-- ТИП + ЗНАЧЕНИЕ -->
                <div class="form-group">
                  <label class="form-label">Тип скидки *</label>
                  <div class="type-selector">
                    <button
                      class="type-btn"
                      :class="{ active: form.type === 'percent' }"
                      @click="form.type = 'percent'"
                      type="button"
                    >% Процент</button>
                    <button
                      class="type-btn"
                      :class="{ active: form.type === 'fixed' }"
                      @click="form.type = 'fixed'"
                      type="button"
                    >₽ Фикс. сумма</button>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">
                    {{ form.type === 'percent' ? 'Размер скидки (%)' : 'Сумма скидки (₽)' }} *
                  </label>
                  <input
                    v-model.number="form.value"
                    type="number"
                    class="form-input"
                    :class="{ error: formErrors.value }"
                    :placeholder="form.type === 'percent' ? '10' : '500'"
                    min="1"
                    :max="form.type === 'percent' ? 100 : undefined"
                  >
                  <span v-if="formErrors.value" class="form-error">{{ formErrors.value }}</span>
                </div>

                <!-- МИН. ЗАКАЗ -->
                <div class="form-group">
                  <label class="form-label">Мин. сумма заказа (₽)</label>
                  <input
                    v-model.number="form.minOrder"
                    type="number"
                    class="form-input"
                    placeholder="0 — без ограничений"
                    min="0"
                  >
                </div>

                <!-- МАКС. ИСПОЛЬЗОВАНИЙ -->
                <div class="form-group">
                  <label class="form-label">Макс. применений</label>
                  <input
                    v-model.number="form.maxUses"
                    type="number"
                    class="form-input"
                    placeholder="0 — неограниченно"
                    min="0"
                  >
                </div>

                <!-- ДАТА ИСТЕЧЕНИЯ -->
                <div class="form-group full">
                  <label class="form-label">Действует до (необязательно)</label>
                  <input
                    v-model="form.expiresAt"
                    type="date"
                    class="form-input"
                  >
                  <span class="form-hint">Оставьте пустым — без срока действия</span>
                </div>

                <!-- АКТИВЕН -->
                <div class="form-group full">
                  <label class="toggle-row">
                    <span class="form-label" style="margin-bottom:0">Активен</span>
                    <div class="toggle-wrap">
                      <input type="checkbox" v-model="form.active" class="toggle-input" id="toggle-active">
                      <label for="toggle-active" class="toggle-track"></label>
                    </div>
                  </label>
                </div>

              </div>

              <!-- PREVIEW -->
              <div class="discount-preview" v-if="form.value > 0">
                <span class="preview-label">Пример:</span>
                <span class="preview-text">
                  При заказе на 5 000 ₽ скидка составит
                  <strong>{{ previewDiscount }} ₽</strong>
                  → итого <strong>{{ previewFinal }} ₽</strong>
                </span>
              </div>

              <div v-if="formError" class="form-error-banner">{{ formError }}</div>
            </div>

            <div class="modal-footer">
              <button class="btn-cancel" @click="closeForm">Отмена</button>
              <button class="btn-save" @click="saveDiscount" :disabled="saving">
                {{ saving ? 'Сохранение...' : (editingCode ? 'Сохранить' : 'Создать') }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ═══ CONFIRM DELETE ═══ -->
      <Teleport to="body">
        <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
          <div class="modal modal-sm">
            <div class="modal-header">
              <h2 class="modal-title">Удалить промокод?</h2>
              <button class="modal-close" @click="deleteTarget = null">✕</button>
            </div>
            <div class="modal-body">
              <p class="confirm-text">
                Промокод <strong class="code-highlight">{{ deleteTarget }}</strong> будет удалён без возможности восстановления.
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" @click="deleteTarget = null">Отмена</button>
              <button class="btn-delete" @click="doDelete" :disabled="saving">
                {{ saving ? 'Удаление...' : 'Удалить' }}
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

definePageMeta({ layout: 'admin' })

const { getDiscounts, createDiscount, updateDiscount, deleteDiscount } = useAdminApi()

interface Discount {
  code: string
  type: 'percent' | 'fixed'
  value: number
  minOrder: number
  maxUses: number
  usedCount: number
  expiresAt: string | null
  active: boolean
  createdAt: string
}

const discounts  = ref<Discount[]>([])
const loading    = ref(true)
const loadError  = ref('')
const showForm   = ref(false)
const editingCode = ref<string | null>(null)
const saving     = ref(false)
const formError  = ref('')
const deleteTarget = ref<string | null>(null)

const formDefault = () => ({
  code: '',
  type: 'percent' as 'percent' | 'fixed',
  value: 0,
  minOrder: 0,
  maxUses: 0,
  expiresAt: '',
  active: true,
})

const form       = ref(formDefault())
const formErrors = ref<Record<string, string>>({})

onMounted(async () => {
  await loadDiscounts()
})

async function loadDiscounts() {
  loading.value = true
  loadError.value = ''
  try {
    const data = await getDiscounts() as Discount[]
    discounts.value = Array.isArray(data) ? data : []
  } catch (e: any) {
    loadError.value = e?.data?.error || e?.message || 'Ошибка загрузки'
  } finally {
    loading.value = false
  }
}

function openCreateForm() {
  editingCode.value = null
  form.value = formDefault()
  formErrors.value = {}
  formError.value = ''
  showForm.value = true
}

function openEditForm(d: Discount) {
  editingCode.value = d.code
  form.value = {
    code: d.code,
    type: d.type,
    value: d.value,
    minOrder: d.minOrder,
    maxUses: d.maxUses,
    expiresAt: d.expiresAt ? d.expiresAt.slice(0, 10) : '',
    active: d.active,
  }
  formErrors.value = {}
  formError.value = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

function validate() {
  const e: Record<string, string> = {}
  if (!editingCode.value && !form.value.code) e.code = 'Введите код'
  if (!form.value.value || form.value.value <= 0) e.value = 'Введите значение'
  if (form.value.type === 'percent' && form.value.value > 100) e.value = 'Не более 100%'
  formErrors.value = e
  return Object.keys(e).length === 0
}

async function saveDiscount() {
  if (!validate()) return
  saving.value = true
  formError.value = ''
  try {
    const payload = {
      code:      form.value.code,
      type:      form.value.type,
      value:     form.value.value,
      minOrder:  form.value.minOrder || 0,
      maxUses:   form.value.maxUses  || 0,
      expiresAt: form.value.expiresAt || null,
      active:    form.value.active,
    }
    if (editingCode.value) {
      await updateDiscount(editingCode.value, payload)
    } else {
      await createDiscount(payload)
    }
    await loadDiscounts()
    closeForm()
  } catch (e: any) {
    formError.value = e?.data?.error || e?.message || 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}

async function toggleActive(d: Discount) {
  try {
    await updateDiscount(d.code, { active: !d.active })
    await loadDiscounts()
  } catch (e: any) {
    loadError.value = e?.data?.error || e?.message || 'Ошибка'
  }
}

function confirmDelete(code: string) {
  deleteTarget.value = code
}

async function doDelete() {
  if (!deleteTarget.value) return
  saving.value = true
  try {
    await deleteDiscount(deleteTarget.value)
    deleteTarget.value = null
    await loadDiscounts()
  } catch (e: any) {
    loadError.value = e?.data?.error || e?.message || 'Ошибка удаления'
  } finally {
    saving.value = false
  }
}

function isExpired(date: string) {
  return new Date(date) < new Date()
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const SAMPLE = 5000
const previewDiscount = computed(() => {
  if (!form.value.value) return 0
  return form.value.type === 'percent'
    ? Math.round(SAMPLE * form.value.value / 100)
    : Math.min(form.value.value, SAMPLE)
})
const previewFinal = computed(() => Math.max(0, SAMPLE - previewDiscount.value).toLocaleString('ru'))
</script>

<style scoped>
/* ─── PAGE HEADER ─── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
  gap: 16px;
}
.page-title {
  font-family: var(--font-gothic);
  font-size: 28px;
  color: var(--white);
  text-shadow: 0 0 20px var(--red-glow);
  margin-bottom: 4px;
}
.page-sub {
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--mid);
  text-transform: uppercase;
}

/* ─── STATS ─── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}
.stat-card {
  background: var(--deep);
  border: 1px solid var(--border-red);
  padding: 18px 22px;
}
.stat-val {
  font-family: var(--font-gothic);
  font-size: 32px;
  color: var(--white);
  text-shadow: 0 0 16px var(--red-glow);
}
.stat-label {
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.2em;
  color: var(--mid);
  text-transform: uppercase;
  margin-top: 4px;
}

/* ─── BUTTONS ─── */
.btn-add {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 1px solid var(--red);
  color: var(--red-bright);
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-add:hover {
  background: var(--red-deep);
  color: var(--white);
  box-shadow: 0 0 20px var(--red-glow);
}

/* ─── TABLE ─── */
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border-red);
}
.disc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.disc-table thead tr {
  background: var(--deep);
  border-bottom: 1px solid var(--border-red);
}
.disc-table th {
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mid);
  padding: 12px 16px;
  text-align: left;
  white-space: nowrap;
}
.disc-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--light);
  vertical-align: middle;
}
.disc-table tbody tr:last-child td { border-bottom: none; }
.disc-table tbody tr:hover td { background: rgba(255,255,255,0.02); }
.disc-table tbody tr.inactive td { opacity: 0.5; }

.code-cell {
  font-family: var(--font-cinzel);
  font-size: 13px;
  color: var(--white) !important;
  letter-spacing: 0.08em;
}
.type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid;
  font-family: var(--font-cinzel);
  font-size: 11px;
  font-weight: 700;
}
.type-badge.percent { border-color: var(--red); color: var(--red-bright); }
.type-badge.fixed   { border-color: #c8a84b; color: #c8a84b; }

.value-cell {
  font-family: var(--font-cinzel);
  font-size: 13px;
  color: var(--off-white) !important;
}
.uses-cell { font-family: var(--font-cinzel); font-size: 12px; }
.uses-max { color: var(--mid); }
.no-limit { color: var(--mid); }
.expired { color: #e74c3c !important; }

.status-toggle {
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 5px 10px;
  border: 1px solid var(--border);
  background: none;
  color: var(--mid);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.status-toggle.active {
  border-color: #27ae60;
  color: #2ecc71;
}
.status-toggle:hover { border-color: var(--red); color: var(--red-bright); }

.actions-cell {
  display: flex;
  gap: 6px;
  align-items: center;
}
.btn-icon {
  background: none;
  border: 1px solid var(--border);
  color: var(--mid);
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-icon:hover { border-color: var(--red-bright); color: var(--white); background: rgba(192,57,43,0.12); }
.btn-icon.danger:hover { border-color: #e74c3c; color: #e74c3c; background: rgba(231,76,60,0.1); }

/* ─── EMPTY / LOADING ─── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  border: 1px solid var(--border-red);
  text-align: center;
}
.empty-icon {
  font-family: var(--font-gothic);
  font-size: 48px;
  color: rgba(192,57,43,0.2);
  line-height: 1;
}
.empty-title { font-family: var(--font-cinzel); font-size: 16px; color: var(--white); letter-spacing: 0.1em; }
.empty-sub { font-size: 12px; color: var(--mid); letter-spacing: 0.05em; }

.loading-state {
  text-align: center;
  padding: 40px;
  font-family: var(--font-cinzel);
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--mid);
  text-transform: uppercase;
}

.error-banner {
  background: rgba(231,76,60,0.1);
  border: 1px solid var(--red);
  color: var(--red-bright);
  padding: 12px 16px;
  font-size: 12px;
  margin-bottom: 20px;
}

/* ─── MODAL ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(6px);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal {
  background: var(--deep);
  border: 1px solid var(--border-red);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-sm { max-width: 380px; }
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 28px;
  border-bottom: 1px solid var(--border-red);
  flex-shrink: 0;
}
.modal-title {
  font-family: var(--font-cinzel);
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--white);
}
.modal-close {
  background: none;
  border: 1px solid var(--border);
  color: var(--mid);
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.modal-close:hover { border-color: var(--red); color: var(--white); background: var(--red-deep); }

.modal-body {
  padding: 24px 28px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.modal-footer {
  padding: 18px 28px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* FORM */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group.full { grid-column: 1 / -1; }
.form-label {
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--light);
  margin-bottom: 2px;
}
.form-input {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--white);
  font-family: var(--font-body);
  font-size: 13px;
  padding: 10px 14px;
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus { border-color: var(--red); background: var(--card); }
.form-input.error { border-color: #e74c3c; }
.form-error { font-size: 10px; color: #e74c3c; }
.form-hint { font-size: 10px; color: var(--mid); letter-spacing: 0.05em; }
.form-error-banner {
  background: rgba(231,76,60,0.1);
  border: 1px solid var(--red);
  color: var(--red-bright);
  padding: 10px 14px;
  font-size: 11px;
}

.code-display {
  font-family: var(--font-cinzel);
  font-size: 18px;
  color: var(--red-bright);
  letter-spacing: 0.1em;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-red);
}

.type-selector { display: flex; gap: 0; }
.type-btn {
  flex: 1;
  padding: 10px;
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: none;
  border: 1px solid var(--border);
  color: var(--mid);
  cursor: pointer;
  transition: all 0.2s;
}
.type-btn:first-child { border-right: none; }
.type-btn.active { background: var(--red-deep); border-color: var(--red); color: var(--white); }
.type-btn:hover:not(.active) { border-color: var(--border-red); color: var(--light); }

/* TOGGLE */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.toggle-wrap { position: relative; }
.toggle-input { position: absolute; opacity: 0; width: 0; height: 0; }
.toggle-track {
  display: block;
  width: 40px;
  height: 22px;
  background: var(--border);
  border-radius: 11px;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
}
.toggle-track::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 3px;
  width: 16px;
  height: 16px;
  background: var(--mid);
  border-radius: 50%;
  transition: transform 0.2s, background 0.2s;
}
.toggle-input:checked + .toggle-track { background: var(--red-deep); }
.toggle-input:checked + .toggle-track::after { transform: translateX(18px); background: var(--red-bright); }

/* PREVIEW */
.discount-preview {
  background: rgba(192,57,43,0.06);
  border: 1px solid var(--border-red);
  padding: 12px 16px;
  font-size: 12px;
  color: var(--light);
  line-height: 1.6;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.preview-label {
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--red);
  white-space: nowrap;
  padding-top: 2px;
}
.discount-preview strong { color: var(--white); }

/* CONFIRM */
.confirm-text {
  font-size: 13px;
  color: var(--light);
  line-height: 1.7;
}
.code-highlight {
  font-family: var(--font-cinzel);
  color: var(--red-bright);
  letter-spacing: 0.08em;
}

/* FOOTER BUTTONS */
.btn-cancel {
  background: none;
  border: 1px solid var(--border);
  color: var(--mid);
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel:hover { border-color: var(--white); color: var(--white); }
.btn-save {
  background: transparent;
  border: 1px solid var(--red);
  color: var(--red-bright);
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 10px 24px;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-save:hover:not(:disabled) { background: var(--red-deep); color: var(--white); }
.btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-delete {
  background: transparent;
  border: 1px solid #e74c3c;
  color: #e74c3c;
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  padding: 10px 24px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-delete:hover:not(:disabled) { background: rgba(231,76,60,0.15); color: var(--white); }
.btn-delete:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 768px) {
  .stats-row { grid-template-columns: repeat(3, 1fr); }
  .page-header { flex-direction: column; }
  .form-grid { grid-template-columns: 1fr; }
  .form-group.full { grid-column: 1; }
  .disc-table th:nth-child(4),
  .disc-table td:nth-child(4) { display: none; }
}
</style>
