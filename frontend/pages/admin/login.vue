<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-logo">4PLAYAZ</div>
      <div class="login-subtitle">ADMIN PANEL</div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Логин</label>
          <input
            v-model="username"
            type="text"
            placeholder="admin"
            autocomplete="username"
          >
        </div>
        <div class="form-group">
          <label>Пароль</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
          >
        </div>
        <div class="form-group">
          <label>Код из приложения</label>
          <input
            v-model="totp"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="000000"
            autocomplete="one-time-code"
            class="totp-input"
          >
          <div class="totp-hint">Откройте Google Authenticator и введите 6-значный код</div>
        </div>
        <div v-if="error" class="login-error">{{ error }}</div>
        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="loading">...</span>
          <span v-else>ВОЙТИ</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAdminApi } from '~/composables/useApi'

definePageMeta({ layout: false })

const { login } = useAdminApi()

const username = ref('')
const password = ref('')
const totp = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!username.value || !password.value || !totp.value) {
    error.value = 'Заполните все поля'
    return
  }
  if (totp.value.length !== 6 || !/^\d{6}$/.test(totp.value)) {
    error.value = 'Код должен состоять из 6 цифр'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res: any = await login(username.value, password.value, totp.value)
    localStorage.setItem('admin_token', res.token)
    await navigateTo('/admin')
  } catch (e: any) {
    error.value = e?.message || 'Ошибка входа'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  background: var(--black);
  display: flex;
  align-items: center;
  justify-content: center;
  background-image:
    radial-gradient(ellipse at 20% 50%, rgba(120, 0, 0, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 50%, rgba(120, 0, 0, 0.04) 0%, transparent 60%);
}
.login-card {
  width: 380px;
  background: var(--deep);
  border: 1px solid var(--border-red);
  padding: 52px 44px;
}
.login-logo {
  font-family: var(--font-gothic);
  font-size: 42px;
  color: var(--white);
  text-align: center;
  text-shadow: 0 0 30px var(--red-glow);
  margin-bottom: 4px;
}
.login-subtitle {
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.4em;
  text-align: center;
  color: var(--red);
  margin-bottom: 44px;
}
.login-form { display: flex; flex-direction: column; gap: 20px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label {
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--mid);
}
.form-group input {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--white);
  padding: 12px 16px;
  font-family: var(--font-body);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.form-group input:focus { border-color: var(--red); }
.totp-input {
  letter-spacing: 0.3em;
  font-size: 18px !important;
  text-align: center;
}
.totp-hint {
  font-size: 9px;
  color: var(--border);
  font-family: var(--font-cinzel);
  letter-spacing: 0.08em;
  line-height: 1.5;
}
.login-error {
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.15em;
  color: var(--red-bright);
  text-align: center;
}
.login-btn {
  background: var(--red-deep);
  border: 1px solid var(--red);
  color: var(--white);
  padding: 14px;
  font-family: var(--font-cinzel);
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;
}
.login-btn:hover:not(:disabled) {
  background: var(--red);
  box-shadow: 0 0 24px var(--red-glow);
}
.login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
