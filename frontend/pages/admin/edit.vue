<template>
  <div>
    <div class="page-header">
      <NuxtLink to="/admin/products" class="back-btn">← Назад</NuxtLink>
      <h2 class="page-title">Редактировать товар</h2>
    </div>

    <div v-if="loadingProduct" class="loading">Загрузка...</div>

    <div v-else-if="!product" class="error">Товар не найден</div>

    <div v-else class="form-wrapper">
      <div class="form-grid">
        <div class="form-fields">

          <div class="form-group">
            <label>Название товара *</label>
            <input v-model="form.name" type="text">
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
            <div class="form-group">
              <label>Коллекция</label>
              <select v-model="form.category">
                <option value="">Без коллекции</option>
                <option v-for="col in collections" :key="col" :value="col">{{ col }}</option>
                <option v-if="form.category && !collections.includes(form.category)" :value="form.category">
                  {{ form.category }} (не в коллекциях)
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Цена (₽) *</label>
              <input v-model="form.price" type="number">
            </div>
          </div>

          <div class="form-group">
            <label>Старая цена (₽)</label>
            <input v-model="form.oldPrice" type="number" placeholder="Оставить пустым если нет скидки">
          </div>

          <div class="form-group">
            <label>Описание</label>
            <textarea v-model="form.desc"></textarea>
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
        </div>

        <!-- ФОТО -->
        <div class="form-image">
          <div class="form-group">
            <label>Фотографии</label>
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
              <p v-if="!isDragging"><strong>Добавить фото</strong></p>
              <p v-else>Отпустите</p>
              <p class="upload-hint">JPG, PNG, WEBP · до 10 МБ</p>
            </div>

            <div v-if="images.length > 0" class="images-grid">
              <div v-for="(img, idx) in images" :key="idx" class="image-thumb" :class="{ primary: idx === 0 }">
                <img :src="resolveImg(img)">
                <div class="thumb-overlay">
                  <span v-if="idx === 0" class="primary-badge">Главное</span>
                  <button class="remove-img" type="button" @click.stop="removeImage(idx)">✕</button>
                </div>
              </div>
            </div>
            <p v-if="images.length > 1" class="images-hint">Первое фото — главное</p>
          </div>

          <div class="form-group">
            <label>Или URL изображения</label>
            <div class="url-row">
              <input v-model="urlInput" type="text" placeholder="https://...">
              <button type="button" class="add-url-btn" @click="addImageUrl">Добавить</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="errorMsg" class="form-error">{{ errorMsg }}</div>
      <div v-if="successMsg" class="form-success">{{ successMsg }}</div>

      <button class="submit-btn" :disabled="submitting" @click="handleSubmit">
        <span v-if="submitting">Сохранение...</span>
        <span v-else>✓ Сохранить изменения</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'auth' })

const route = useRoute()
const config = useRuntimeConfig()
const API_BASE = config.public.apiBase

const resolveImg = (src: string): string => {
  if (!src) return ''
  if (src.startsWith('data:') || src.startsWith('http')) return src
  return `${API_BASE}${src}`
}

const product = ref<any>(null)
const loadingProduct = ref(true)
const submitting = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const urlInput = ref('')
const images = ref<string[]>([])

const badges = ['', 'New', 'Best Seller', 'Sale', 'Pre-Order', 'Exclusive']

const collections = ref<string[]>([])

const fetchCollections = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/collections`)
    collections.value = await res.json()
  } catch { collections.value = [] }
}

const form = reactive({
  name: '',
  category: '',
  clothingType: '',
  price: '',
  oldPrice: '',
  desc: '',
  badge: '',
})

onMounted(async () => {
  await fetchCollections()
  const id = route.params.id
  try {
    const res = await fetch(`${API_BASE}/api/products/${id}`)
    if (!res.ok) throw new Error('Not found')
    const data = await res.json()
    product.value = data
    form.name = data.name || ''
    form.category = data.category || ''
    form.clothingType = data.clothingType || ''
    form.price = data.price?.toString() || ''
    form.oldPrice = data.oldPrice?.toString() || ''
    form.desc = data.desc || ''
    form.badge = data.badge || ''
    images.value = data.images?.length ? [...data.images] : (data.image ? [data.image] : [])
  } catch {
    product.value = null
  } finally {
    loadingProduct.value = false
  }
})

const readFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) { reject(new Error(`Файл ${file.name} > 10МБ`)); return }
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
  successMsg.value = ''
  if (!form.name.trim()) { errorMsg.value = 'Введите название'; return }
  if (!form.price || Number(form.price) <= 0) { errorMsg.value = 'Введите корректную цену'; return }

  submitting.value = true
  try {
    const token = localStorage.getItem('admin_token') || ''
    const response = await fetch(`${API_BASE}/api/admin/products/${route.params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        name: form.name.trim(),
        category: form.category,
        clothingType: form.clothingType,
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
      errorMsg.value = `Ошибка: ${response.status} — ${err.error || 'неизвестная'}`
      return
    }
    successMsg.value = '✓ Товар обновлён'
    setTimeout(() => navigateTo('/admin/products'), 1000)
  } catch (err: any) {
    errorMsg.value = `Ошибка соединения: ${err?.message}`
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-header { display: flex; align-items: center; gap: 20px; margin-bottom: 28px; }
.back-btn { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.2em; color: var(--mid); text-decoration: none; border: 1px solid var(--border); padding: 8px 14px; transition: all 0.2s; }
.back-btn:hover { border-color: var(--red); color: var(--white); }
.page-title { font-family: var(--font-cinzel); font-size: 16px; letter-spacing: 0.2em; color: var(--white); text-transform: uppercase; }
.loading, .error { text-align: center; padding: 60px; font-family: var(--font-cinzel); font-size: 12px; color: var(--mid); letter-spacing: 0.15em; }
.form-wrapper { background: var(--deep); border: 1px solid var(--border); padding: 36px; }
.form-grid { display: grid; grid-template-columns: 1fr 340px; gap: 40px; margin-bottom: 24px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--mid); margin-bottom: 8px; }
.form-group input, .form-group textarea, .form-group select { width: 100%; background: var(--surface); border: 1px solid var(--border); color: var(--white); padding: 12px 14px; font-family: var(--font-body); font-size: 13px; outline: none; transition: border-color 0.2s; appearance: none; }
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: var(--red); }
.form-group textarea { min-height: 100px; resize: vertical; line-height: 1.6; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.badge-options { display: flex; gap: 8px; flex-wrap: wrap; }
.badge-opt { padding: 6px 14px; border: 1px solid var(--border); background: none; font-family: var(--font-cinzel); font-size: 8px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--mid); cursor: pointer; transition: all 0.2s; }
.badge-opt.selected { background: var(--red-deep); border-color: var(--red); color: var(--white); }
.badge-opt.sale.selected { background: var(--red); }
.upload-zone { border: 2px dashed var(--border); padding: 30px 20px; text-align: center; cursor: pointer; transition: all 0.2s; }
.upload-zone:hover, .upload-zone.drag-over { border-color: var(--red); background: rgba(120,0,0,0.07); }
.upload-icon { font-size: 28px; margin-bottom: 8px; }
.upload-zone p { font-size: 12px; color: var(--mid); }
.upload-zone p strong { color: var(--off-white); }
.upload-hint { font-size: 10px !important; opacity: 0.45; margin-top: 4px !important; }
.images-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
.image-thumb { position: relative; aspect-ratio: 3/4; overflow: hidden; border: 1px solid var(--border); }
.image-thumb.primary { border-color: var(--red); }
.image-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 6px; opacity: 0; transition: opacity 0.2s; background: rgba(0,0,0,0.5); }
.image-thumb:hover .thumb-overlay { opacity: 1; }
.image-thumb.primary .thumb-overlay { opacity: 1; background: transparent; }
.image-thumb.primary:hover .thumb-overlay { background: rgba(0,0,0,0.5); }
.primary-badge { font-family: var(--font-cinzel); font-size: 7px; letter-spacing: 0.15em; color: var(--white); background: var(--red-deep); border: 1px solid var(--red); padding: 2px 6px; width: fit-content; }
.remove-img { background: rgba(0,0,0,0.7); border: 1px solid var(--border-red); color: var(--white); width: 24px; height: 24px; font-size: 10px; cursor: pointer; transition: all 0.2s; align-self: flex-end; display: flex; align-items: center; justify-content: center; }
.remove-img:hover { background: var(--red-deep); border-color: var(--red); }
.images-hint { font-size: 10px; color: var(--mid); margin-top: 6px; }
.url-row { display: flex; gap: 8px; }
.url-row input { flex: 1; }
.add-url-btn { background: var(--surface); border: 1px solid var(--border); color: var(--off-white); font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; padding: 0 14px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.add-url-btn:hover { border-color: var(--red); color: var(--white); }
.form-error { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.12em; color: var(--red-bright); margin-bottom: 16px; padding: 12px 14px; border: 1px solid var(--red-deep); background: rgba(120,0,0,0.1); }
.form-success { font-family: var(--font-cinzel); font-size: 9px; letter-spacing: 0.15em; color: #4caf50; margin-bottom: 16px; padding: 12px 14px; border: 1px solid #2e7d32; background: rgba(46,125,50,0.1); }
.submit-btn { width: 100%; background: var(--red-deep); border: 1px solid var(--red); color: var(--white); padding: 15px; font-family: var(--font-cinzel); font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
.submit-btn:hover:not(:disabled) { background: var(--red); box-shadow: 0 0 24px var(--red-glow); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
