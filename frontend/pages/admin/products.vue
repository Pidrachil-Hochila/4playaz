<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Все товары</h2>
      <NuxtLink to="/admin/add" class="add-btn">⊕ Добавить</NuxtLink>
    </div>

    <div v-if="loading" class="loading">Загрузка...</div>

    <div v-else-if="products.length === 0" class="empty">
      <p>Товары не добавлены</p>
      <NuxtLink to="/admin/add" class="add-btn">Добавить первый товар</NuxtLink>
    </div>

    <template v-else>
      <div class="filters">
        <div class="search-wrap">
          <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            v-model="search"
            type="text"
            class="search-input"
            placeholder="Поиск по названию или описанию…"
          >
          <button v-if="search" class="search-clear" aria-label="Очистить" @click="search = ''">✕</button>
        </div>

        <select v-model="categoryFilter" class="filter-select">
          <option value="">Все категории</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>

        <select v-if="clothingTypes.length" v-model="typeFilter" class="filter-select">
          <option value="">Все типы</option>
          <option v-for="t in clothingTypes" :key="t" :value="t">{{ t }}</option>
        </select>

        <select v-model="visibilityFilter" class="filter-select">
          <option value="all">Все</option>
          <option value="visible">Видимые</option>
          <option value="hidden">Скрытые</option>
        </select>

        <button v-if="hasActiveFilters" class="reset-btn" @click="resetFilters">Сбросить</button>
      </div>

      <div class="results-count">{{ filteredProducts.length }} из {{ products.length }}</div>

      <div v-if="filteredProducts.length === 0" class="empty">
        <p>Ничего не найдено</p>
      </div>

      <div v-else class="products-list">
        <div class="product-item" v-for="p in filteredProducts" :key="p.id" :class="{ 'is-hidden': p.hidden }">
        <div class="product-thumb">
          <img v-if="p.image" :src="p.image" :alt="p.name">
          <div v-else class="thumb-placeholder">4PZ</div>
        </div>
        <div class="product-data">
          <div class="product-name">
            {{ p.name }}
            <span v-if="p.hidden" class="hidden-tag">СКРЫТ</span>
          </div>
          <div class="product-meta">
            <span class="cat">{{ p.category }}</span>
            <span class="price">{{ p.price.toLocaleString('ru') }} ₽</span>
            <span v-if="p.badge" class="badge">{{ p.badge }}</span>
          </div>
          <div v-if="p.desc" class="product-desc">{{ p.desc }}</div>
        </div>
        <div class="product-actions">
          <NuxtLink :to="`/admin/edit/${p.id}`" class="edit-btn">Изменить</NuxtLink>
          <button
            class="hide-btn"
            :class="{ 'is-active': p.hidden }"
            :disabled="togglingId === p.id"
            @click="handleToggle(p)"
          >
            {{ p.hidden ? 'Показать' : 'Скрыть' }}
          </button>
          <button class="delete-btn" @click="handleDelete(p.id)">Удалить</button>
        </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminApi } from '~/composables/useApi'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const { deleteProduct, getAllProducts, toggleVisibility } = useAdminApi()

const products = ref<any[]>([])
const loading = ref(true)
const togglingId = ref<number | null>(null)

const search = ref('')
const categoryFilter = ref('')
const typeFilter = ref('')
const visibilityFilter = ref('all')

const categories = computed(() =>
  [...new Set(products.value.map(p => p.category).filter(Boolean))].sort()
)
const clothingTypes = computed(() =>
  [...new Set(products.value.map(p => p.clothingType).filter(Boolean))].sort()
)

const hasActiveFilters = computed(() =>
  !!search.value || !!categoryFilter.value || !!typeFilter.value || visibilityFilter.value !== 'all'
)

const filteredProducts = computed(() => {
  const q = search.value.trim().toLowerCase()
  return products.value.filter(p => {
    if (q && !(`${p.name ?? ''} ${p.desc ?? ''}`.toLowerCase().includes(q))) return false
    if (categoryFilter.value && p.category !== categoryFilter.value) return false
    if (typeFilter.value && p.clothingType !== typeFilter.value) return false
    if (visibilityFilter.value === 'visible' && p.hidden) return false
    if (visibilityFilter.value === 'hidden' && !p.hidden) return false
    return true
  })
})

const resetFilters = () => {
  search.value = ''
  categoryFilter.value = ''
  typeFilter.value = ''
  visibilityFilter.value = 'all'
}

const fetchProducts = async () => {
  try {
    products.value = await getAllProducts() as any[]
  } catch {} finally {
    loading.value = false
  }
}

const handleDelete = async (id: number) => {
  if (!confirm('Удалить этот товар?')) return
  try {
    await deleteProduct(id)
    products.value = products.value.filter(p => p.id !== id)
  } catch {
    alert('Ошибка при удалении')
  }
}

const handleToggle = async (p: any) => {
  togglingId.value = p.id
  try {
    const res = await toggleVisibility(p.id, !p.hidden)
    p.hidden = res.hidden
  } catch {
    alert('Не удалось изменить видимость')
  } finally {
    togglingId.value = null
  }
}

onMounted(fetchProducts)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}
.page-title {
  font-family: var(--font-cinzel);
  font-size: 16px;
  letter-spacing: 0.2em;
  color: var(--white);
  text-transform: uppercase;
}
.add-btn {
  background: var(--red-deep);
  border: 1px solid var(--red);
  color: var(--white);
  padding: 10px 20px;
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}
.add-btn:hover { background: var(--red); }

.loading, .empty {
  text-align: center;
  padding: 60px;
  font-family: var(--font-cinzel);
  font-size: 12px;
  color: var(--mid);
  letter-spacing: 0.15em;
}
.empty { display: flex; flex-direction: column; align-items: center; gap: 20px; }

.filters {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.search-wrap {
  position: relative;
  flex: 1;
  min-width: 220px;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 12px;
  color: var(--mid);
  pointer-events: none;
}
.search-input {
  width: 100%;
  background: var(--deep);
  border: 1px solid var(--border);
  color: var(--white);
  font-family: var(--font-body);
  font-size: 13px;
  padding: 10px 34px 10px 36px;
  outline: none;
  transition: border-color 0.2s;
}
.search-input::placeholder { color: var(--mid); }
.search-input:focus { border-color: var(--border-red); }
.search-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: var(--mid);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 6px;
  transition: color 0.2s;
}
.search-clear:hover { color: var(--red-bright); }
.filter-select {
  background: var(--deep);
  border: 1px solid var(--border);
  color: var(--white);
  font-family: var(--font-body);
  font-size: 12px;
  padding: 10px 12px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.filter-select:focus { border-color: var(--border-red); }
.reset-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--mid);
  padding: 9px 14px;
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}
.reset-btn:hover { border-color: var(--red); color: var(--red-bright); }
.results-count {
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.15em;
  color: var(--mid);
  margin-bottom: 14px;
}

.products-list { display: flex; flex-direction: column; gap: 12px; }
.product-item {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  background: var(--deep);
  border: 1px solid var(--border);
  padding: 16px;
  transition: border-color 0.2s;
}
.product-item:hover { border-color: var(--border-red); }
.product-item.is-hidden { opacity: 0.55; }
.product-item.is-hidden .product-thumb img { filter: grayscale(1); }

.hidden-tag {
  display: inline-block;
  margin-left: 8px;
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.2em;
  color: var(--mid);
  border: 1px solid var(--border);
  padding: 2px 6px;
  vertical-align: middle;
}

.product-thumb {
  width: 60px; height: 80px;
  flex-shrink: 0;
  background: var(--surface);
  overflow: hidden;
}
.product-thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb-placeholder {
  width: 100%; height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-gothic);
  font-size: 16px;
  color: rgba(192,57,43,0.2);
}

.product-data { flex: 1; min-width: 0; }
.product-name {
  font-family: var(--font-cinzel);
  font-size: 13px;
  color: var(--white);
  margin-bottom: 6px;
}
.product-meta { display: flex; gap: 12px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
.cat { font-size: 10px; color: var(--red); letter-spacing: 0.1em; }
.price { font-size: 12px; color: var(--off-white); }
.badge {
  font-family: var(--font-cinzel);
  font-size: 7px;
  letter-spacing: 0.15em;
  color: var(--white);
  background: var(--red-deep);
  border: 1px solid var(--red);
  padding: 2px 8px;
}
.product-desc {
  font-size: 11px;
  color: var(--mid);
  line-height: 1.5;
  overflow: hidden;
  max-height: 2.6em;
}

.product-actions { flex-shrink: 0; }
.delete-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--mid);
  padding: 6px 14px;
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}
.delete-btn:hover {
  border-color: var(--red);
  color: var(--red-bright);
}
.edit-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--mid);
  padding: 6px 14px;
  font-family: var(--font-cinzel);
  font-size: 8px; letter-spacing: 0.15em;
  text-transform: uppercase;
  cursor: pointer; text-decoration: none;
  display: inline-block;
  transition: all 0.2s;
}
.edit-btn:hover { border-color: var(--red-bright); color: var(--red-bright); }

.hide-btn {
  background: none;
  border: 1px solid var(--border);
  color: var(--mid);
  padding: 6px 14px;
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  display: block;
  margin-top: 4px;
  width: 100%;
}
.hide-btn:hover:not(:disabled) { border-color: var(--off-white); color: var(--off-white); }
.hide-btn:disabled { opacity: 0.5; cursor: wait; }
.hide-btn.is-active { border-color: var(--off-white); color: var(--off-white); }

@media (max-width: 768px) {
  .page-header { margin-bottom: 14px; }
  .page-title { font-size: 11px; letter-spacing: 0.12em; }
  .add-btn { padding: 8px 12px; font-size: 8px; }
  .product-item { padding: 10px; gap: 10px; }
  .product-thumb { width: 44px; height: 58px; }
  .product-name { font-size: 11px; margin-bottom: 4px; }
  .product-meta { gap: 8px; }
  .cat { font-size: 9px; }
  .price { font-size: 11px; }
  .product-desc { font-size: 10px; }
  .product-actions { display: flex; flex-direction: column; gap: 5px; }
  .edit-btn, .delete-btn, .hide-btn { padding: 5px 10px; font-size: 7px; }
  .hide-btn { margin-top: 0; }
  .filters { gap: 8px; }
  .search-wrap { flex-basis: 100%; min-width: 0; }
  .filter-select { flex: 1; font-size: 11px; padding: 9px 8px; }
}
</style>
