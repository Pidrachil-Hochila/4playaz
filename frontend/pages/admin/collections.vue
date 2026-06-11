<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Коллекции</h2>
    </div>

    <!-- СОЗДАНИЕ -->
    <form class="create-row" @submit.prevent="handleCreate">
      <input
        v-model="newName"
        type="text"
        class="create-input"
        placeholder="Название новой коллекции…"
        maxlength="100"
      >
      <button type="submit" class="add-btn" :disabled="creating || !newName.trim()">
        {{ creating ? '…' : '⊕ Создать' }}
      </button>
    </form>
    <div v-if="error" class="form-error">{{ error }}</div>

    <div v-if="loading" class="loading">Загрузка...</div>

    <div v-else-if="collections.length === 0" class="empty">
      <p>Коллекций пока нет</p>
    </div>

    <div v-else class="collections-list">
      <div class="collection-item" v-for="c in collectionsWithCount" :key="c.name">
        <div class="collection-data">
          <!-- РЕЖИМ ПРОСМОТРА -->
          <template v-if="editingName !== c.name">
            <div class="collection-name">{{ c.name }}</div>
            <div class="collection-meta">
              <span class="count">{{ c.count }} {{ pluralProducts(c.count) }}</span>
            </div>
          </template>

          <!-- РЕЖИМ РЕДАКТИРОВАНИЯ -->
          <form v-else class="edit-form" @submit.prevent="handleRename(c.name)">
            <input
              ref="editInput"
              v-model="editValue"
              type="text"
              class="edit-input"
              maxlength="100"
              @keydown.esc="cancelEdit"
            >
            <button type="submit" class="save-btn" :disabled="savingName || !editValue.trim()">Сохранить</button>
            <button type="button" class="cancel-btn" @click="cancelEdit">Отмена</button>
          </form>
        </div>

        <div class="collection-actions" v-if="editingName !== c.name">
          <button class="edit-btn" @click="startEdit(c.name)">Изменить</button>
          <button class="delete-btn" @click="handleDelete(c)">Удалить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAdminApi } from '~/composables/useApi'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const { getCollections, getAllProducts, createCollection, renameCollection, deleteCollection } = useAdminApi()

const collections = ref<string[]>([])
const products = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const newName = ref('')
const creating = ref(false)

const editingName = ref<string | null>(null)
const editValue = ref('')
const editInput = ref<HTMLInputElement[] | HTMLInputElement | null>(null)
const savingName = ref(false)

const collectionsWithCount = computed(() =>
  collections.value.map(name => ({
    name,
    count: products.value.filter(p => p.category === name).length,
  }))
)

const pluralProducts = (n: number) => {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'товар'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'товара'
  return 'товаров'
}

const fetchData = async () => {
  loading.value = true
  try {
    const [cols, prods] = await Promise.all([getCollections(), getAllProducts()])
    collections.value = cols as string[]
    products.value = prods as any[]
  } catch {
    error.value = 'Не удалось загрузить данные'
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  const name = newName.value.trim()
  if (!name) return
  creating.value = true
  error.value = ''
  try {
    const res = await createCollection(name)
    collections.value.push(res.name)
    newName.value = ''
  } catch (e: any) {
    error.value = e?.data?.error || 'Не удалось создать коллекцию'
  } finally {
    creating.value = false
  }
}

const startEdit = async (name: string) => {
  editingName.value = name
  editValue.value = name
  error.value = ''
  await nextTick()
  const el = Array.isArray(editInput.value) ? editInput.value[0] : editInput.value
  el?.focus()
  el?.select()
}

const cancelEdit = () => {
  editingName.value = null
  editValue.value = ''
}

const handleRename = async (oldName: string) => {
  const name = editValue.value.trim()
  if (!name || name === oldName) { cancelEdit(); return }
  savingName.value = true
  error.value = ''
  try {
    const res = await renameCollection(oldName, name)
    const idx = collections.value.indexOf(oldName)
    if (idx !== -1) collections.value[idx] = res.name
    // обновляем category у локально загруженных товаров для пересчёта
    products.value.forEach(p => { if (p.category === oldName) p.category = res.name })
    cancelEdit()
  } catch (e: any) {
    error.value = e?.data?.error || 'Не удалось переименовать коллекцию'
  } finally {
    savingName.value = false
  }
}

const handleDelete = async (c: { name: string; count: number }) => {
  const warn = c.count > 0
    ? `Удалить коллекцию «${c.name}»?\n\nК ней привязано товаров: ${c.count}. Они останутся, но их категория станет несуществующей.`
    : `Удалить коллекцию «${c.name}»?`
  if (!confirm(warn)) return
  try {
    await deleteCollection(c.name)
    collections.value = collections.value.filter(x => x !== c.name)
  } catch {
    error.value = 'Не удалось удалить коллекцию'
  }
}

onMounted(fetchData)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.page-title {
  font-family: var(--font-cinzel);
  font-size: 16px;
  letter-spacing: 0.2em;
  color: var(--white);
  text-transform: uppercase;
}

.create-row { display: flex; gap: 10px; margin-bottom: 8px; }
.create-input {
  flex: 1;
  background: var(--deep);
  border: 1px solid var(--border);
  color: var(--white);
  font-family: var(--font-body);
  font-size: 13px;
  padding: 10px 14px;
  outline: none;
  transition: border-color 0.2s;
}
.create-input::placeholder { color: var(--mid); }
.create-input:focus { border-color: var(--border-red); }

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
  white-space: nowrap;
  transition: all 0.2s;
}
.add-btn:hover:not(:disabled) { background: var(--red); }
.add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.form-error {
  color: var(--red-bright);
  font-size: 11px;
  margin-bottom: 16px;
  letter-spacing: 0.05em;
}

.loading, .empty {
  text-align: center;
  padding: 60px;
  font-family: var(--font-cinzel);
  font-size: 12px;
  color: var(--mid);
  letter-spacing: 0.15em;
}

.collections-list { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.collection-item {
  display: flex;
  gap: 18px;
  align-items: center;
  background: var(--deep);
  border: 1px solid var(--border);
  padding: 16px;
  transition: border-color 0.2s;
}
.collection-item:hover { border-color: var(--border-red); }

.collection-data { flex: 1; min-width: 0; }
.collection-name {
  font-family: var(--font-cinzel);
  font-size: 13px;
  color: var(--white);
  margin-bottom: 6px;
  letter-spacing: 0.05em;
}
.collection-meta { display: flex; gap: 12px; align-items: center; }
.count { font-size: 11px; color: var(--mid); letter-spacing: 0.1em; }

.edit-form { display: flex; gap: 8px; align-items: center; }
.edit-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border-red);
  color: var(--white);
  font-family: var(--font-body);
  font-size: 13px;
  padding: 8px 12px;
  outline: none;
}

.collection-actions { flex-shrink: 0; display: flex; gap: 8px; }
.edit-btn, .delete-btn, .save-btn, .cancel-btn {
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
.edit-btn:hover { border-color: var(--red-bright); color: var(--red-bright); }
.delete-btn:hover { border-color: var(--red); color: var(--red-bright); }
.save-btn {
  background: var(--red-deep);
  border-color: var(--red);
  color: var(--white);
}
.save-btn:hover:not(:disabled) { background: var(--red); }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.cancel-btn:hover { border-color: var(--off-white); color: var(--off-white); }

@media (max-width: 768px) {
  .page-title { font-size: 11px; letter-spacing: 0.12em; }
  .create-row { flex-wrap: wrap; }
  .add-btn { padding: 8px 12px; font-size: 8px; }
  .collection-item { padding: 12px; gap: 10px; flex-wrap: wrap; }
  .collection-actions { width: 100%; }
  .edit-btn, .delete-btn { flex: 1; padding: 6px 8px; font-size: 7px; }
  .edit-form { flex-wrap: wrap; }
  .edit-input { flex-basis: 100%; }
}
</style>
