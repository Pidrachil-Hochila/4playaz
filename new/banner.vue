<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Баннер-уведомление</h2>
    </div>

    <p class="hint">
      Тонкая полоса в самом верху сайта. Используй для глобальных промо: «−15% на всё»,
      «Бесплатная доставка от 7000 ₽» и т.п. Пользователь может закрыть баннер —
      он не появится снова, пока ты не изменишь текст или даты.
    </p>

    <div v-if="loading" class="loading">Загрузка...</div>

    <div v-else class="form-wrapper">
      <!-- PREVIEW -->
      <div class="preview-strip" :style="{ background: form.bgColor, color: form.textColor }">
        <span v-if="form.text">{{ form.text }}</span>
        <span v-else class="preview-empty">— превью пустого баннера —</span>
      </div>
      <div class="preview-status">
        <span class="status-dot" :class="{ on: serverActive }"></span>
        <span v-if="serverActive">Баннер сейчас активен на сайте</span>
        <span v-else>Баннер не показывается (выключен или вне дат)</span>
      </div>

      <!-- FIELDS -->
      <div class="form-group">
        <label>Текст баннера *</label>
        <input v-model="form.text" type="text" maxlength="200" placeholder="−15% СКИДКА НА ВСЕ ТОВАРЫ">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Включён</label>
          <button type="button" class="toggle-btn" :class="{ on: form.enabled }" @click="form.enabled = !form.enabled">
            {{ form.enabled ? 'ВКЛ' : 'ВЫКЛ' }}
          </button>
        </div>
        <div class="form-group">
          <label>Цвет фона</label>
          <input v-model="form.bgColor" type="color">
        </div>
        <div class="form-group">
          <label>Цвет текста</label>
          <input v-model="form.textColor" type="color">
        </div>
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

      <div v-if="errorMsg" class="form-error">{{ errorMsg }}</div>
      <div v-if="successMsg" class="form-success">{{ successMsg }}</div>

      <button class="submit-btn" :disabled="submitting" @click="save">
        {{ submitting ? 'Сохранение...' : '✓ Сохранить баннер' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const config = useRuntimeConfig()
const API_BASE = config.public.apiBase
const getToken = () => localStorage.getItem('admin_token') || ''

const loading = ref(true)
const submitting = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const serverActive = ref(false)

const form = reactive({
  enabled: false,
  text: '',
  startDate: '',
  endDate: '',
  bgColor: '#7d0a0a',
  textColor: '#ffffff',
})

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

const fetchBanner = async () => {
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/banner`)
    const data = await res.json()
    form.enabled = !!data.enabled
    form.text = data.text || ''
    form.startDate = toLocalInput(data.startDate)
    form.endDate = toLocalInput(data.endDate)
    form.bgColor = data.bgColor || '#7d0a0a'
    form.textColor = data.textColor || '#ffffff'
    serverActive.value = !!data.active
  } catch (e: any) {
    errorMsg.value = e?.message || 'Не удалось загрузить'
  } finally {
    loading.value = false
  }
}

const save = async () => {
  errorMsg.value = ''
  successMsg.value = ''
  if (form.enabled && !form.text.trim()) {
    errorMsg.value = 'Введите текст баннера'
    return
  }
  submitting.value = true
  try {
    const res = await fetch(`${API_BASE}/api/admin/banner`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        enabled: form.enabled,
        text: form.text.trim(),
        startDate: fromLocalInput(form.startDate),
        endDate: fromLocalInput(form.endDate),
        bgColor: form.bgColor,
        textColor: form.textColor,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    const data = await res.json()
    serverActive.value = !!data.active
    successMsg.value = '✓ Сохранено'
    setTimeout(() => { successMsg.value = '' }, 2500)
  } catch (e: any) {
    errorMsg.value = e?.message || 'Ошибка сохранения'
  } finally {
    submitting.value = false
  }
}

onMounted(fetchBanner)
</script>

<style scoped>
.page-header { margin-bottom: 20px; }
.page-title { font-family: var(--font-cinzel); font-size: 16px; letter-spacing: 0.2em; color: var(--white); text-transform: uppercase; }
.hint { font-family: var(--font-body); font-size: 12px; color: var(--mid); margin-bottom: 24px; line-height: 1.6; max-width: 720px; }

.loading { background: var(--deep); border: 1px solid var(--border); padding: 40px; text-align: center; font-family: var(--font-cinzel); font-size: 11px; letter-spacing: 0.15em; color: var(--mid); }

.form-wrapper { background: var(--deep); border: 1px solid var(--border); padding: 30px; max-width: 720px; }

.preview-strip {
  padding: 12px 18px; font-family: var(--font-cinzel); font-size: 11px;
  letter-spacing: 0.2em; text-transform: uppercase; text-align: center;
  margin-bottom: 8px; min-height: 42px; display: flex; align-items: center;
  justify-content: center;
}
.preview-empty { opacity: 0.5; }
.preview-status { display: flex; align-items: center; gap: 8px; font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--mid); margin-bottom: 24px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--mid); }
.status-dot.on { background: #2ecc71; box-shadow: 0 0 8px #2ecc71; }

.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mid); margin-bottom: 8px; }
.form-group input[type="text"], .form-group input[type="datetime-local"] {
  width: 100%; background: var(--surface); border: 1px solid var(--border); color: var(--white);
  padding: 11px 13px; font-family: var(--font-body); font-size: 13px; outline: none;
  transition: border-color 0.2s;
}
.form-group input[type="text"]:focus, .form-group input[type="datetime-local"]:focus { border-color: var(--red); }
.form-group input[type="color"] { width: 100%; height: 42px; background: var(--surface); border: 1px solid var(--border); padding: 4px; cursor: pointer; }
.form-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 6px; }
.form-row:nth-of-type(2) { grid-template-columns: 1fr 1fr; }

.toggle-btn { background: var(--surface); border: 1px solid var(--border); color: var(--mid); padding: 11px 14px; font-family: var(--font-cinzel); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; width: 100%; transition: all 0.2s; }
.toggle-btn.on { background: var(--red-deep); border-color: var(--red); color: var(--white); }

.form-error { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.12em; color: var(--red-bright); margin: 14px 0; padding: 12px 14px; border: 1px solid var(--red-deep); background: rgba(120,0,0,0.1); }
.form-success { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.15em; color: #4caf50; margin: 14px 0; padding: 12px 14px; border: 1px solid #2e7d32; background: rgba(46,125,50,0.1); }

.submit-btn { width: 100%; background: var(--red-deep); border: 1px solid var(--red); color: var(--white); padding: 15px; font-family: var(--font-cinzel); font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; margin-top: 12px; }
.submit-btn:hover:not(:disabled) { background: var(--red); box-shadow: 0 0 24px var(--red-glow); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 600px) {
  .form-row, .form-row:nth-of-type(2) { grid-template-columns: 1fr; }
}
</style>
