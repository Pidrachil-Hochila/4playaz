<template>
  <div>
    <div class="page-header">
      <h2 class="page-title">Добавить товар</h2>
    </div>

    <!-- ─── ПРЕСЕТЫ ────────────────────────────────────────── -->
    <div class="presets-block">
      <div class="presets-header">
        <span class="presets-label">ПРЕСЕТЫ</span>
        <button class="preset-new-btn" @click="openNewPreset">+ Создать пресет</button>
      </div>

      <div v-if="presets.length === 0" class="presets-empty">
        Нет сохранённых пресетов. Создай пресет чтобы быстро заполнять форму.
      </div>

      <div v-else class="presets-list">
        <div
          v-for="preset in presets"
          :key="preset.id"
          class="preset-card"
          @click="applyPreset(preset)"
          title="Нажми чтобы применить"
        >
          <div class="preset-name">{{ preset.name }}</div>
          <div class="preset-meta">
            <span v-if="preset.data.clothingType" class="preset-tag">{{ clothingTypeLabel(preset.data.clothingType) }}</span>
            <span v-if="preset.data.category" class="preset-tag">{{ preset.data.category }}</span>
            <span v-if="preset.data.price" class="preset-tag">{{ Number(preset.data.price).toLocaleString('ru') }} ₽</span>
            <span v-if="preset.data.badge" class="preset-tag badge-tag">{{ preset.data.badge }}</span>
          </div>
          <button class="preset-delete" @click.stop="deletePreset(preset.id)" title="Удалить пресет">✕</button>
        </div>
      </div>
    </div>

    <!-- ─── МОДАЛ СОЗДАНИЯ ПРЕСЕТА ─────────────────────────── -->
    <Teleport to="body">
      <div class="modal-overlay" :class="{ open: showPresetModal }" @click.self="showPresetModal = false">
        <div class="preset-modal">
          <div class="preset-modal-header">
            <span>Новый пресет</span>
            <button @click="showPresetModal = false">✕</button>
          </div>
          <div class="preset-modal-body">
            <div class="form-group">
              <label>Название пресета *</label>
              <input v-model="newPreset.name" placeholder="Например: Худи XBOX360 базовый">
            </div>
            <div class="form-group">
              <label>Тип одежды</label>
              <select v-model="newPreset.clothingType">
                <option value="">—</option>
                <option value="hoodie">Худи</option>
                <option value="tshirt">Футболка</option>
                <option value="longsleeve">Лонгслив</option>
                <option value="jacket">Куртка</option>
                <option value="pants">Штаны</option>
                <option value="accessories">Аксессуары</option>
              </select>
            </div>
            <div class="form-group">
              <label>Коллекция</label>
              <select v-model="newPreset.category">
                <option value="">Без коллекции</option>
                <option v-for="col in collections" :key="col" :value="col">{{ col }}</option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Цена (₽)</label>
                <input v-model="newPreset.price" type="number" placeholder="6900">
              </div>
              <div class="form-group">
                <label>Старая цена (₽)</label>
                <input v-model="newPreset.oldPrice" type="number" placeholder="—">
              </div>
            </div>
            <div class="form-group">
              <label>Описание</label>
              <textarea v-model="newPreset.desc" placeholder="Описание товара..."></textarea>
            </div>
            <div class="form-group">
              <label>Значок</label>
              <div class="badge-options">
                <button
                  v-for="b in badges" :key="b"
                  class="badge-opt"
                  :class="{ selected: newPreset.badge === b, sale: b === 'Sale' }"
                  type="button"
                  @click="newPreset.badge = newPreset.badge === b ? '' : b"
                >{{ b || 'Без значка' }}</button>
              </div>
            </div>
          </div>
          <div class="preset-modal-footer">
            <button class="preset-save-btn" @click="saveNewPreset">Сохранить пресет</button>
            <button class="preset-cancel-btn" @click="showPresetModal = false">Отмена</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── ОСНОВНАЯ ФОРМА ─────────────────────────────────── -->
    <div class="form-wrapper">
      <div class="form-grid">

        <!-- LEFT: ПОЛЯ -->
        <div class="form-fields">

          <div class="form-group">
            <label>Название товара *</label>
            <input v-model="form.name" type="text" placeholder="Например: Oversized Hoodie XBOX360">
          </div>

          <div class="form-group">
            <label>Тип одежды</label>
            <select v-model="form.clothingType">
              <option value="">Выбрать тип...</option>
              <option value="hoodie">Худи</option>
              <option value="tshirt">Футболка</option>
              <option value="longsleeve">Лонгслив</option>
              <option value="jacket">Куртка</option>
              <option value="pants">Штаны</option>
              <option value="accessories">Аксессуары</option>
            </select>
          </div>

          <div class="form-row">
            <!-- КОЛЛЕКЦИЯ — берётся с бэкенда, можно добавить/удалить -->
            <div class="form-group">
              <label>Коллекция</label>
              <div class="category-select-wrap">
                <select v-model="form.category">
                  <option value="">Без коллекции</option>
                  <option v-for="col in collections" :key="col" :value="col">{{ col }}</option>
                </select>
                <button type="button" class="add-cat-btn" @click="showAddCollection = !showAddCollection" title="Добавить коллекцию">+</button>
              </div>

              <!-- Добавить новую коллекцию -->
              <div v-if="showAddCollection" class="new-collection-row">
                <input
                  v-model="newCollectionName"
                  type="text"
                  placeholder="Название новой коллекции..."
                  @keydown.enter.prevent="addCollection"
                >
                <button type="button" class="confirm-cat-btn" @click="addCollection">✓</button>
                <button type="button" class="cancel-cat-btn" @click="showAddCollection = false; newCollectionName = ''">✕</button>
              </div>

              <!-- Список коллекций с удалением -->
              <div v-if="collections.length > 0" class="collections-manage">
                <span class="collections-manage-label">Управление:</span>
                <div class="collections-tags">
                  <span v-for="col in collections" :key="col" class="col-tag">
                    {{ col }}
                    <button @click="deleteCollection(col)" class="col-tag-del" title="Удалить коллекцию">✕</button>
                  </span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Цена (₽) *</label>
              <input v-model="form.price" type="number" placeholder="6900">
            </div>
          </div>

          <div class="form-group">
            <label>Старая цена (₽) — для скидки</label>
            <input v-model="form.oldPrice" type="number" placeholder="Оставить пустым если нет скидки">
          </div>

          <div class="form-group">
            <label>Описание</label>
            <textarea v-model="form.desc" placeholder="Описание товара, материалы, особенности..."></textarea>
          </div>

          <div class="form-group">
            <label>Значок</label>
            <div class="badge-options">
              <button
                v-for="b in badges" :key="b"
                class="badge-opt"
                :class="{ selected: form.badge === b, sale: b === 'Sale' }"
                type="button"
                @click="form.badge = form.badge === b ? '' : b"
              >{{ b || 'Без значка' }}</button>
            </div>
          </div>

          <div class="form-group">
            <label>Или вставьте URL изображения</label>
            <div class="url-row">
              <input v-model="urlInput" type="text" placeholder="https://...">
              <button type="button" class="add-url-btn" @click="addImageUrl">Добавить</button>
            </div>
          </div>
        </div>

        <!-- RIGHT: ИЗОБРАЖЕНИЯ -->
        <div class="form-image">
          <div class="form-group">
            <label>Изображения (можно несколько)</label>
            <div
              class="upload-zone"
              :class="{ 'drag-over': isDragging }"
              @click="fileInputRef?.click()"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
            >
              <input ref="fileInputRef" type="file" accept="image/*" multiple style="display:none" @change="handleFiles">
              <div class="upload-icon">{{ isDragging ? '📂' : '⬆' }}</div>
              <p v-if="!isDragging"><strong>Нажмите</strong> или перетащите фото</p>
              <p v-else>Отпустите для загрузки</p>
              <p class="upload-hint">JPG, PNG, WEBP · до 10 МБ · можно несколько</p>
            </div>
            <div v-if="images.length > 0" class="images-grid">
              <div v-for="(img, idx) in images" :key="idx" class="image-thumb" :class="{ primary: idx === 0 }">
                <img :src="img" :alt="`Фото ${idx + 1}`">
                <div class="thumb-overlay">
                  <span v-if="idx === 0" class="primary-badge">Главное</span>
                  <button class="remove-img" type="button" @click.stop="removeImage(idx)">✕</button>
                </div>
              </div>
            </div>
            <p v-if="images.length > 1" class="images-hint">Первое фото — главное на карточке</p>
          </div>
        </div>
      </div>

      <div v-if="errorMsg" class="form-error">{{ errorMsg }}</div>
      <div v-if="successMsg" class="form-success">{{ successMsg }}</div>

      <button class="submit-btn" :disabled="submitting" @click="handleSubmit">
        <span v-if="submitting">Сохранение...</span>
        <span v-else>⊕ Добавить товар в каталог</span>
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

// ─── КОЛЛЕКЦИИ (с бэкенда) ─────────────────────────────────
const collections = ref<string[]>([])
const showAddCollection = ref(false)
const newCollectionName = ref('')

const fetchCollections = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/collections`)
    collections.value = await res.json()
  } catch { collections.value = [] }
}

const addCollection = async () => {
  const name = newCollectionName.value.trim()
  if (!name) return
  try {
    const res = await fetch(`${API_BASE}/api/admin/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const data = await res.json()
      await fetchCollections()
      form.category = name
      successMsg.value = data.linkedCount > 0
        ? `Коллекция «${name}» создана. Автоматически привязано товаров: ${data.linkedCount}`
        : `Коллекция «${name}» создана`
      setTimeout(() => { successMsg.value = '' }, 5000)
    } else {
      const err = await res.json()
      errorMsg.value = err.error || 'Ошибка'
    }
  } catch { errorMsg.value = 'Ошибка соединения' }
  newCollectionName.value = ''
  showAddCollection.value = false
}

const deleteCollection = async (name: string) => {
  if (!confirm(`Удалить коллекцию "${name}"?`)) return
  try {
    await fetch(`${API_BASE}/api/admin/collections/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` },
    })
    await fetchCollections()
    if (form.category === name) form.category = ''
  } catch { errorMsg.value = 'Ошибка удаления' }
}

// ─── ПРЕСЕТЫ (в localStorage) ──────────────────────────────
interface Preset {
  id: string
  name: string
  data: {
    clothingType: string
    category: string
    price: string
    oldPrice: string
    desc: string
    badge: string
  }
}

const presets = ref<Preset[]>([])
const showPresetModal = ref(false)
const newPreset = reactive({
  name: '',
  clothingType: '',
  category: '',
  price: '',
  oldPrice: '',
  desc: '',
  badge: '',
})

const loadPresets = () => {
  try {
    const raw = localStorage.getItem('4playaz_presets')
    presets.value = raw ? JSON.parse(raw) : []
  } catch { presets.value = [] }
}

const savePresetsToStorage = () => {
  localStorage.setItem('4playaz_presets', JSON.stringify(presets.value))
}

const openNewPreset = () => {
  // Предзаполнить из текущей формы
  newPreset.name = ''
  newPreset.clothingType = form.clothingType
  newPreset.category = form.category
  newPreset.price = form.price
  newPreset.oldPrice = form.oldPrice
  newPreset.desc = form.desc
  newPreset.badge = form.badge
  showPresetModal.value = true
}

const saveNewPreset = () => {
  if (!newPreset.name.trim()) {
    alert('Введите название пресета')
    return
  }
  const preset: Preset = {
    id: Date.now().toString(),
    name: newPreset.name.trim(),
    data: {
      clothingType: newPreset.clothingType,
      category: newPreset.category,
      price: newPreset.price,
      oldPrice: newPreset.oldPrice,
      desc: newPreset.desc,
      badge: newPreset.badge,
    },
  }
  presets.value.push(preset)
  savePresetsToStorage()
  showPresetModal.value = false
}

const applyPreset = (preset: Preset) => {
  form.clothingType = preset.data.clothingType || ''
  form.category = preset.data.category || ''
  form.price = preset.data.price || ''
  form.oldPrice = preset.data.oldPrice || ''
  form.desc = preset.data.desc || ''
  form.badge = preset.data.badge || ''
}

const deletePreset = (id: string) => {
  presets.value = presets.value.filter(p => p.id !== id)
  savePresetsToStorage()
}

const clothingTypeLabel = (val: string): string => {
  const map: Record<string, string> = { hoodie: 'Худи', tshirt: 'Футболка', longsleeve: 'Лонгслив', jacket: 'Куртка', pants: 'Штаны', accessories: 'Аксессуары' }
  return map[val] || val
}

// ─── ФОРМА ─────────────────────────────────────────────────
const form = reactive({
  name: '',
  category: '',
  clothingType: '',
  price: '',
  oldPrice: '',
  desc: '',
  badge: '',
})

const badges = ['', 'New', 'Best Seller', 'Sale', 'Pre-Order', 'Exclusive']
const images = ref<string[]>([])
const urlInput = ref('')
const errorMsg = ref('')
const successMsg = ref('')
const submitting = ref(false)
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const readFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) { reject(new Error(`Файл ${file.name} превышает 10 МБ`)); return }
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('Ошибка чтения файла'))
    reader.readAsDataURL(file)
  })
}

const handleFiles = async (e: Event) => {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  for (const file of files) {
    try { images.value.push(await readFile(file)) } catch (err: any) { errorMsg.value = err.message }
  }
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const handleDrop = async (e: DragEvent) => {
  isDragging.value = false
  const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'))
  for (const file of files) {
    try { images.value.push(await readFile(file)) } catch (err: any) { errorMsg.value = err.message }
  }
}

const addImageUrl = () => {
  const url = urlInput.value.trim()
  if (!url) return
  images.value.push(url)
  urlInput.value = ''
}

const removeImage = (idx: number) => { images.value.splice(idx, 1) }

const handleSubmit = async () => {
  errorMsg.value = ''
  if (!form.name.trim()) { errorMsg.value = 'Введите название товара'; return }
  if (!form.price || Number(form.price) <= 0) { errorMsg.value = 'Введите корректную цену'; return }

  submitting.value = true
  try {
    const response = await fetch(`${API_BASE}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({
        name: form.name.trim(),
        category: form.category || '',
        clothingType: form.clothingType || '',
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        desc: form.desc.trim(),
        badge: form.badge,
        image: images.value[0] || '',
        images: images.value,
      }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      errorMsg.value = `Ошибка сервера: ${response.status} — ${err.error || 'неизвестная ошибка'}`
      return
    }
    await navigateTo('/admin/products')
  } catch (err: any) {
    errorMsg.value = `Ошибка соединения: ${err?.message || 'Сервер недоступен'}`
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchCollections()
  loadPresets()
})
</script>

<style scoped>
.page-header { margin-bottom: 20px; }
.page-title { font-family: var(--font-cinzel); font-size: 16px; letter-spacing: 0.2em; color: var(--white); text-transform: uppercase; }

/* ─── ПРЕСЕТЫ ─── */
.presets-block {
  background: var(--deep);
  border: 1px solid var(--border);
  padding: 20px 24px;
  margin-bottom: 24px;
}
.presets-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px;
}
.presets-label {
  font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.25em;
  color: var(--red); text-transform: uppercase;
}
.preset-new-btn {
  background: none; border: 1px solid var(--border-red); color: var(--red-bright);
  font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.15em;
  text-transform: uppercase; padding: 7px 16px; cursor: pointer; transition: all 0.2s;
}
.preset-new-btn:hover { background: var(--red-deep); border-color: var(--red); color: var(--white); }

.presets-empty {
  font-size: 12px; color: var(--mid); font-family: var(--font-body);
  padding: 12px 0; letter-spacing: 0.03em;
}
.presets-list {
  display: flex; flex-wrap: wrap; gap: 10px;
}
.preset-card {
  position: relative;
  background: var(--surface); border: 1px solid var(--border);
  padding: 12px 36px 12px 14px;
  cursor: pointer; transition: all 0.2s; min-width: 160px;
}
.preset-card:hover { border-color: var(--red); background: rgba(120,0,0,0.08); }
.preset-name {
  font-family: var(--font-cinzel); font-size: 11px; letter-spacing: 0.1em;
  color: var(--white); margin-bottom: 6px;
}
.preset-meta { display: flex; flex-wrap: wrap; gap: 4px; }
.preset-tag {
  font-family: var(--font-cinzel); font-size: 7px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--mid);
  background: var(--elevated); border: 1px solid var(--border);
  padding: 2px 7px;
}
.badge-tag { color: var(--red-bright); border-color: var(--border-red); }
.preset-delete {
  position: absolute; top: 8px; right: 8px;
  background: none; border: none; color: var(--mid);
  font-size: 10px; cursor: pointer; width: 20px; height: 20px;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.2s; padding: 0;
}
.preset-delete:hover { color: var(--red-bright); }

/* ─── МОДАЛ ПРЕСЕТА ─── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.85);
  z-index: 500; display: none; align-items: center; justify-content: center;
  backdrop-filter: blur(4px); padding: 20px;
}
.modal-overlay.open { display: flex; }
.preset-modal {
  background: var(--deep); border: 1px solid var(--border-red);
  width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto;
  animation: fadeUp 0.25s ease;
}
@keyframes fadeUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.preset-modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 24px; border-bottom: 1px solid var(--border);
  font-family: var(--font-cinzel); font-size: 12px; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--white);
}
.preset-modal-header button {
  background: none; border: none; color: var(--mid); font-size: 16px;
  cursor: pointer; transition: color 0.2s;
}
.preset-modal-header button:hover { color: var(--white); }
.preset-modal-body { padding: 24px; }
.preset-modal-footer {
  display: flex; gap: 10px; padding: 16px 24px;
  border-top: 1px solid var(--border);
}
.preset-save-btn {
  flex: 1; background: var(--red-deep); border: 1px solid var(--red);
  color: var(--white); padding: 12px; font-family: var(--font-cinzel);
  font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase;
  cursor: pointer; transition: all 0.2s;
}
.preset-save-btn:hover { background: var(--red); }
.preset-cancel-btn {
  background: none; border: 1px solid var(--border); color: var(--mid);
  padding: 12px 20px; font-family: var(--font-cinzel); font-size: 9px;
  letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: all 0.2s;
}
.preset-cancel-btn:hover { border-color: var(--red); color: var(--white); }

/* ─── ФОРМА ─── */
.form-wrapper { background: var(--deep); border: 1px solid var(--border); padding: 36px; }
.form-grid { display: grid; grid-template-columns: 1fr 360px; gap: 40px; margin-bottom: 24px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mid); margin-bottom: 8px; }
.form-group input, .form-group textarea, .form-group select { width: 100%; background: var(--surface); border: 1px solid var(--border); color: var(--white); padding: 12px 14px; font-family: var(--font-body); font-size: 13px; outline: none; transition: border-color 0.2s; appearance: none; }
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: var(--red); }
.form-group textarea { min-height: 100px; resize: vertical; line-height: 1.6; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

/* КОЛЛЕКЦИИ */
.category-select-wrap { display: flex; gap: 8px; align-items: stretch; }
.category-select-wrap select { flex: 1; }
.add-cat-btn { background: var(--surface); border: 1px solid var(--border); color: var(--red-bright); font-size: 20px; width: 42px; flex-shrink: 0; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
.add-cat-btn:hover { border-color: var(--red); background: var(--red-deep); }
.new-collection-row { display: flex; gap: 6px; margin-top: 8px; }
.new-collection-row input { flex: 1; padding: 8px 12px; font-size: 12px; }
.confirm-cat-btn, .cancel-cat-btn { background: none; border: 1px solid var(--border); color: var(--mid); width: 34px; cursor: pointer; font-size: 12px; transition: all 0.2s; flex-shrink: 0; }
.confirm-cat-btn:hover { border-color: var(--red); color: var(--red-bright); background: var(--red-deep); }
.cancel-cat-btn:hover { border-color: var(--border); color: var(--white); }

.collections-manage { margin-top: 10px; }
.collections-manage-label { font-family: var(--font-cinzel); font-size: 7px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--mid); display: block; margin-bottom: 6px; }
.collections-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.col-tag {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--surface); border: 1px solid var(--border);
  font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.1em;
  color: var(--off-white); padding: 4px 8px;
}
.col-tag-del { background: none; border: none; color: var(--mid); font-size: 9px; cursor: pointer; padding: 0; line-height: 1; transition: color 0.15s; }
.col-tag-del:hover { color: var(--red-bright); }

/* URL, BADGES */
.url-row { display: flex; gap: 8px; }
.url-row input { flex: 1; }
.add-url-btn { background: var(--surface); border: 1px solid var(--border); color: var(--off-white); font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; padding: 0 14px; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex-shrink: 0; }
.add-url-btn:hover { border-color: var(--red); color: var(--white); }
.badge-options { display: flex; gap: 8px; flex-wrap: wrap; }
.badge-opt { padding: 6px 14px; border: 1px solid var(--border); background: none; font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--mid); cursor: pointer; transition: all 0.2s; }
.badge-opt.selected { background: var(--red-deep); border-color: var(--red); color: var(--white); }
.badge-opt.sale.selected { background: var(--red); }

/* UPLOAD */
.upload-zone { border: 2px dashed var(--border); padding: 40px 20px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative; user-select: none; }
.upload-zone:hover, .upload-zone.drag-over { border-color: var(--red); background: rgba(120,0,0,0.07); }
.upload-zone.drag-over { border-style: solid; }
.upload-icon { font-size: 32px; margin-bottom: 10px; }
.upload-zone p { font-size: 12px; color: var(--mid); }
.upload-zone p strong { color: var(--off-white); }
.upload-hint { font-size: 10px !important; opacity: 0.45; margin-top: 6px !important; }
.images-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
.image-thumb { position: relative; aspect-ratio: 3/4; overflow: hidden; border: 1px solid var(--border); cursor: default; }
.image-thumb.primary { border-color: var(--red); }
.image-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 6px; opacity: 0; transition: opacity 0.2s; background: rgba(0,0,0,0.5); }
.image-thumb:hover .thumb-overlay { opacity: 1; }
.image-thumb.primary .thumb-overlay { opacity: 1; background: transparent; }
.image-thumb.primary:hover .thumb-overlay { background: rgba(0,0,0,0.5); }
.primary-badge { font-family: var(--font-cinzel); font-size: 7px; letter-spacing: 0.15em; color: var(--white); background: var(--red-deep); border: 1px solid var(--red); padding: 2px 6px; width: fit-content; align-self: flex-start; }
.remove-img { background: rgba(0,0,0,0.7); border: 1px solid var(--border-red); color: var(--white); width: 24px; height: 24px; font-size: 10px; cursor: pointer; transition: all 0.2s; align-self: flex-end; display: flex; align-items: center; justify-content: center; }
.remove-img:hover { background: var(--red-deep); border-color: var(--red); }
.images-hint { font-size: 10px; color: var(--mid); margin-top: 6px; letter-spacing: 0.05em; }

.form-error { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.12em; color: var(--red-bright); margin-bottom: 16px; padding: 12px 14px; border: 1px solid var(--red-deep); background: rgba(120,0,0,0.1); line-height: 1.6; }
.form-success { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.12em; color: #2ecc71; margin-bottom: 16px; padding: 12px 14px; border: 1px solid #196f3d; background: rgba(46,204,113,0.08); line-height: 1.6; }
.submit-btn { width: 100%; background: var(--red-deep); border: 1px solid var(--red); color: var(--white); padding: 15px; font-family: var(--font-cinzel); font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
.submit-btn:hover:not(:disabled) { background: var(--red); box-shadow: 0 0 24px var(--red-glow); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 900px) {
  .form-grid { grid-template-columns: 1fr; }
  .images-grid { grid-template-columns: repeat(4, 1fr); }
  .presets-list { flex-direction: column; }
}
</style>
