<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">РАССЫЛКА</h2>
      <div class="recipients-pill">
        <span v-if="recipientCount === null">загрузка…</span>
        <span v-else>{{ recipientCount }} {{ pluralRecipients(recipientCount) }} в базе</span>
      </div>
    </div>

    <div class="broadcast-form">
      <div class="field-group">
        <label class="field-label">Тема письма</label>
        <input
          v-model="subject"
          type="text"
          class="text-input"
          :class="{ error: fieldError === 'subject' }"
          placeholder="Например: Новый дроп уже в магазине"
          maxlength="150"
        >
      </div>

      <div class="field-group">
        <label class="field-label">Текст письма</label>
        <textarea
          v-model="bodyText"
          class="text-area"
          :class="{ error: fieldError === 'text' }"
          rows="10"
          placeholder="Текст письма. Переносы строк сохранятся. Оформление возьмёт фирменный шаблон 4PLAYAZ."
        ></textarea>
        <span class="field-hint">Простой текст — заголовок, шапка и подвал добавятся автоматически.</span>
      </div>

      <div v-if="okMessage" class="state-banner state-ok">{{ okMessage }}</div>
      <div v-if="errorMessage" class="state-banner state-err">{{ errorMessage }}</div>

      <div class="actions-row">
        <div class="test-block">
          <input
            v-model="testEmail"
            type="email"
            class="text-input test-input"
            placeholder="email для теста"
          >
          <button class="btn-secondary" :disabled="busy" @click="sendTest">
            <span v-if="sendingTest" class="spinner"></span>
            {{ sendingTest ? 'Отправка…' : 'Отправить тест себе' }}
          </button>
        </div>
        <button class="btn-primary" :disabled="busy" @click="openConfirm">
          Отправить всем
        </button>
      </div>
    </div>

    <!-- CONFIRM MODAL -->
    <Teleport to="body">
      <div class="modal-overlay" :class="{ open: confirmOpen }" @click.self="closeConfirm">
        <div class="modal-box">
          <div class="modal-label">ПОДТВЕРЖДЕНИЕ РАССЫЛКИ</div>
          <p class="modal-text">
            Письмо «<b>{{ subject }}</b>» будет отправлено
            <b>{{ recipientCount }} {{ pluralRecipients(recipientCount || 0) }}</b>
            из базы. Действие необратимо.
          </p>
          <div class="modal-footer">
            <button class="btn-cancel" :disabled="sendingAll" @click="closeConfirm">Отмена</button>
            <button class="btn-primary" :disabled="sendingAll" @click="confirmSend">
              <span v-if="sendingAll" class="spinner"></span>
              {{ sendingAll ? 'Рассылка…' : 'Да, отправить всем' }}
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

const { getBroadcastRecipients, sendBroadcast } = useAdminApi()

const subject = ref('')
const bodyText = ref('')
const testEmail = ref('')
const recipientCount = ref<number | null>(null)
const sendingTest = ref(false)
const sendingAll = ref(false)
const confirmOpen = ref(false)
const okMessage = ref('')
const errorMessage = ref('')
const fieldError = ref<'subject' | 'text' | ''>('')

const busy = computed(() => sendingTest.value || sendingAll.value)

const pluralRecipients = (n: number) => {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'адрес'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'адреса'
  return 'адресов'
}

const validate = () => {
  okMessage.value = ''
  errorMessage.value = ''
  fieldError.value = ''
  if (!subject.value.trim()) { fieldError.value = 'subject'; errorMessage.value = 'Укажите тему письма'; return false }
  if (!bodyText.value.trim()) { fieldError.value = 'text'; errorMessage.value = 'Введите текст письма'; return false }
  return true
}

const sendTest = async () => {
  if (!validate()) return
  if (!testEmail.value.trim()) { errorMessage.value = 'Укажите email для теста'; return }
  sendingTest.value = true
  try {
    await sendBroadcast(subject.value.trim(), bodyText.value, testEmail.value.trim())
    okMessage.value = `Тестовое письмо отправлено на ${testEmail.value.trim()}`
  } catch (err: any) {
    errorMessage.value = err?.data?.message || 'Не удалось отправить тестовое письмо'
  } finally {
    sendingTest.value = false
  }
}

const openConfirm = () => {
  if (!validate()) return
  confirmOpen.value = true
}

const closeConfirm = () => {
  if (sendingAll.value) return
  confirmOpen.value = false
}

const confirmSend = async () => {
  sendingAll.value = true
  try {
    const res = await sendBroadcast(subject.value.trim(), bodyText.value)
    confirmOpen.value = false
    okMessage.value = `Рассылка отправлена: ${res.sent} писем`
    subject.value = ''
    bodyText.value = ''
  } catch (err: any) {
    errorMessage.value = err?.data?.message || 'Ошибка рассылки'
    confirmOpen.value = false
  } finally {
    sendingAll.value = false
  }
}

onMounted(async () => {
  try {
    const res = await getBroadcastRecipients()
    recipientCount.value = res.count
  } catch {
    recipientCount.value = 0
  }
})
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
.recipients-pill {
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--mid);
  border: 1px solid var(--border);
  padding: 7px 14px;
}

.broadcast-form {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.field-group { display: flex; flex-direction: column; }
.field-label {
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--mid);
  text-transform: uppercase;
  margin-bottom: 8px;
}
.field-hint { margin-top: 6px; font-size: 11px; color: var(--mid); }

.text-input, .text-area {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--white);
  padding: 12px 14px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.text-area { font-family: inherit; line-height: 1.6; resize: vertical; }
.text-input:focus, .text-area:focus { border-color: var(--red); }
.text-input.error, .text-area.error { border-color: var(--red-bright); }

.state-banner {
  font-size: 12px;
  padding: 10px 14px;
  border-left: 3px solid;
}
.state-ok  { color: #6ad28a; border-color: #2f7a44; background: rgba(47,122,68,0.10); }
.state-err { color: var(--red-bright); border-color: var(--red); background: rgba(192,57,43,0.08); }

.actions-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.test-block { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.test-input { width: 220px; }

.btn-primary, .btn-secondary {
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  padding: 12px 24px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.btn-primary {
  background: var(--red-deep);
  border: 1px solid var(--red);
  color: var(--white);
}
.btn-primary:hover:not(:disabled) { background: var(--red); }
.btn-secondary {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--off-white);
}
.btn-secondary:hover:not(:disabled) { border-color: var(--red); color: var(--red-bright); }
.btn-primary:disabled, .btn-secondary:disabled { opacity: 0.5; cursor: default; }

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
  width: 460px;
  max-width: calc(100vw - 40px);
  padding: 32px;
}
.modal-label {
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.3em;
  color: var(--red);
  margin-bottom: 14px;
}
.modal-text { font-size: 13px; color: var(--off-white); line-height: 1.7; margin: 0 0 24px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; }
.btn-cancel {
  background: none;
  border: 1px solid var(--border);
  color: var(--mid);
  padding: 12px 20px;
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel:hover:not(:disabled) { border-color: var(--red); color: var(--red-bright); }

.spinner {
  width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .page-title { font-size: 11px; letter-spacing: 0.12em; }
  .actions-row { flex-direction: column; align-items: stretch; }
  .test-block { flex-direction: column; align-items: stretch; }
  .test-input { width: 100%; }
  .btn-primary, .btn-secondary { justify-content: center; }
}
</style>
