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

    <div v-else class="products-list">
      <div class="product-item" v-for="p in products" :key="p.id">
        <div class="product-thumb">
          <img v-if="p.image" :src="p.image" :alt="p.name">
          <div v-else class="thumb-placeholder">4PZ</div>
        </div>
        <div class="product-data">
          <div class="product-name">{{ p.name }}</div>
          <div class="product-meta">
            <span class="cat">{{ p.category }}</span>
            <span class="price">{{ p.price.toLocaleString('ru') }} ₽</span>
            <span v-if="p.badge" class="badge">{{ p.badge }}</span>
          </div>
          <div v-if="p.desc" class="product-desc">{{ p.desc }}</div>
        </div>
        <div class="product-actions">
          <NuxtLink :to="`/admin/edit/${p.id}`" class="edit-btn">Изменить</NuxtLink>
          <button class="delete-btn" @click="handleDelete(p.id)">Удалить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'
import { useAdminApi } from '~/composables/useApi'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const { getProducts } = useApi()
const { deleteProduct } = useAdminApi()

const products = ref<any[]>([])
const loading = ref(true)

const fetchProducts = async () => {
  try {
    products.value = await getProducts() as any[]
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
</style>
