import { ref } from 'vue'

// ─── Загрузка изображений товара ───────────────────────────
// Единая логика для admin/add.vue и admin/edit — раньше был
// дословно скопирован один и тот же код в трёх файлах.
//
// opts.initial — стартовый список картинок (для страницы редактирования
//   список приходит с бэкенда позже — присваивай напрямую: images.value = [...])
// opts.onError — куда писать сообщения об ошибках (errorMsg на странице)
export const useImageUpload = (opts: {
  initial?: string[]
  onError?: (msg: string) => void
} = {}) => {
  const images       = ref<string[]>([...(opts.initial || [])])
  const isDragging   = ref(false)
  const fileInputRef = ref<HTMLInputElement | null>(null)
  const urlInput     = ref('')
  const reportError  = opts.onError || (() => {})

  const readFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error(`Файл ${file.name} превышает 10 МБ`))
        return
      }
      const reader = new FileReader()
      reader.onload  = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Ошибка чтения файла'))
      reader.readAsDataURL(file)
    })

  const addFiles = async (files: File[]) => {
    for (const file of files) {
      try { images.value.push(await readFile(file)) }
      catch (err: any) { reportError(err.message) }
    }
  }

  const handleFiles = async (e: Event) => {
    await addFiles(Array.from((e.target as HTMLInputElement).files || []))
    if (fileInputRef.value) fileInputRef.value.value = ''
  }

  const handleDrop = async (e: DragEvent) => {
    isDragging.value = false
    await addFiles(
      Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'))
    )
  }

  const addImageUrl = () => {
    const url = urlInput.value.trim()
    if (!url) return
    images.value.push(url)
    urlInput.value = ''
  }

  const removeImage = (idx: number) => { images.value.splice(idx, 1) }

  // Сделать фото с индексом idx главным (переместить в начало)
  const makePrimary = (idx: number) => {
    if (idx <= 0 || idx >= images.value.length) return
    const [img] = images.value.splice(idx, 1)
    images.value.unshift(img)
  }

  return {
    images, isDragging, fileInputRef, urlInput,
    handleFiles, handleDrop, addImageUrl, removeImage, makePrimary,
  }
}
