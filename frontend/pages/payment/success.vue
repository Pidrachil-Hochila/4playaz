<template>
  <div class="success-page">
    <div class="success-card">
      <div class="success-icon">✓</div>
      <h1 class="success-title">Ваш заказ оформлен!</h1>
      <p class="success-text">
        В скором времени вы получите уведомление на почту с ссылкой на оплату товара и доставки.
      </p>
      <div class="success-info">
        <p>Проверяйте папку «Входящие» и «Спам» — письмо придёт в течение нескольких минут.</p>
        <p>По вопросам: <a href="https://t.me/playaz_store" target="_blank" class="success-link">@playaz_store</a></p>
      </div>
      <NuxtLink to="/" class="btn-primary">Вернуться в магазин</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Заказ оформлен — 4PLAYAZ' })

onMounted(() => {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('opened')) {
    url.searchParams.set('opened', '1')
    window.open(url.toString(), '_blank')
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.replace('/')
    }
  }
})
</script>

<style scoped>
.success-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}
.success-card {
  max-width: 500px;
  width: 100%;
  text-align: center;
  padding: 60px 40px;
  background: var(--deep);
  border: 1px solid var(--border-red);
  animation: fadeUp 0.4s ease;
}
@keyframes fadeUp {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.success-icon {
  width: 64px; height: 64px;
  border: 2px solid var(--red);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: var(--red-bright);
  margin: 0 auto 28px;
}
.success-title {
  font-family: var(--font-cinzel);
  font-size: 26px; font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--white);
  margin-bottom: 18px;
}
.success-text {
  font-size: 13px; color: var(--light);
  line-height: 1.8; margin-bottom: 24px;
}
.success-info {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 18px 20px;
  margin-bottom: 32px;
  display: flex; flex-direction: column; gap: 8px;
}
.success-info p { font-size: 12px; color: var(--mid); line-height: 1.6; }
.success-link { color: var(--red-bright); }
.btn-primary {
  display: inline-block; background: transparent; color: var(--red-bright);
  padding: 14px 40px; font-family: var(--font-cinzel); font-size: 9px;
  letter-spacing: 0.25em; text-transform: uppercase;
  border: 1px solid var(--red); cursor: pointer; transition: all 0.3s;
  text-decoration: none;
}
.btn-primary:hover {
  background: var(--red-deep); border-color: var(--red-bright);
  color: var(--white); box-shadow: 0 0 30px var(--red-glow);
}
</style>
