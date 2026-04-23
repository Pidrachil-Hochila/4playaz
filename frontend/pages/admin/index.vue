<template>
  <div>
    <div class="dashboard">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Всего товаров</div>
          <div class="stat-value">{{ products.length }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">DJ XBOX360</div>
          <div class="stat-value">{{ products.filter(p => p.category === 'DJ XBOX360').length }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">PROPOVEDNIK</div>
          <div class="stat-value">{{ products.filter(p => p.category === '3.5 PROPOVEDNIK COLLECTION').length }}</div>
        </div>
        <div class="stat-card highlight">
          <div class="stat-label">Telegram Shop</div>
          <div class="stat-value">
            <a href="https://t.me/bymyclick" target="_blank">@bymyclick</a>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <h3 class="section-heading">Быстрые действия</h3>
        <div class="actions-row">
          <NuxtLink to="/admin/add" class="action-btn">⊕ Добавить товар</NuxtLink>
          <NuxtLink to="/admin/products" class="action-btn secondary">◉ Все товары</NuxtLink>
          <a href="/" target="_blank" class="action-btn secondary">↗ Открыть магазин</a>
        </div>
      </div>

      <div class="recent-products" v-if="products.length > 0">
        <h3 class="section-heading">Последние товары</h3>
        <div class="products-table">
          <div class="table-header">
            <span>Название</span>
            <span>Категория</span>
            <span>Цена</span>
            <span>Значок</span>
          </div>
          <div class="table-row" v-for="p in products.slice(0, 6)" :key="p.id">
            <span class="product-name-cell">{{ p.name }}</span>
            <span class="category-cell">{{ p.category }}</span>
            <span>{{ p.price.toLocaleString('ru') }} ₽</span>
            <span class="badge-cell" v-if="p.badge">{{ p.badge }}</span>
            <span v-else class="no-badge">—</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const { getProducts } = useApi()
const products = ref<any[]>([])

onMounted(async () => {
  try {
    products.value = await getProducts() as any[]
  } catch {}
})
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 40px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat-card {
  background: var(--deep);
  border: 1px solid var(--border);
  padding: 24px 28px;
  transition: border-color 0.2s;
}
.stat-card:hover { border-color: var(--border-red); }
.stat-card.highlight { border-color: var(--red-deep); }
.stat-label {
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--mid);
  margin-bottom: 12px;
}
.stat-value {
  font-family: var(--font-cinzel);
  font-size: 28px;
  font-weight: 600;
  color: var(--white);
}
.stat-value a { color: var(--red-bright); text-decoration: none; font-size: 14px; }
.stat-value a:hover { text-decoration: underline; }

.section-heading {
  font-family: var(--font-cinzel);
  font-size: 10px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--red);
  margin-bottom: 16px;
}

.actions-row { display: flex; gap: 12px; flex-wrap: wrap; }
.action-btn {
  display: inline-block;
  background: var(--red-deep);
  border: 1px solid var(--red);
  color: var(--white);
  padding: 12px 24px;
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}
.action-btn:hover { background: var(--red); box-shadow: 0 0 20px var(--red-glow); }
.action-btn.secondary {
  background: transparent;
  border-color: var(--border);
  color: var(--mid);
}
.action-btn.secondary:hover { border-color: var(--red); color: var(--white); box-shadow: none; }

.products-table {
  background: var(--deep);
  border: 1px solid var(--border);
  overflow: hidden;
}
.table-header, .table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  padding: 12px 20px;
  gap: 16px;
  align-items: center;
}
.table-header {
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--mid);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.table-row {
  font-size: 12px;
  color: var(--off-white);
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}
.table-row:last-child { border-bottom: none; }
.table-row:hover { background: var(--surface); }
.product-name-cell { color: var(--white); font-family: var(--font-cinzel); font-size: 11px; }
.category-cell { color: var(--red); font-size: 10px; letter-spacing: 0.08em; }
.badge-cell {
  background: var(--red-deep);
  border: 1px solid var(--red);
  padding: 2px 8px;
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.15em;
  color: var(--white);
  width: fit-content;
}
.no-badge { color: var(--border); }
</style>
