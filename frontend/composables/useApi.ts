const getBase = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string
  const appBase = (config.app?.baseURL ?? '/').replace(/\/$/, '')
  return apiBase || appBase
}

// GitHub Pages serves extensionless files as application/octet-stream,
// which causes $fetch (ofetch) to return a Blob instead of parsed JSON.
// Using native fetch + text() + JSON.parse bypasses Content-Type detection.
const fetchJson = async (url: string): Promise<any> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  const text = await res.text()
  return JSON.parse(text)
}

export const useApi = () => {
  const base = getBase()

  const getProducts = async (category?: string) => {
    const url = category
      ? `${base}/api/products?category=${encodeURIComponent(category)}`
      : `${base}/api/products`
    const data = await fetchJson(url)
    return Array.isArray(data) ? data : []
  }

  const getProduct = async (id: number) => {
    return await $fetch(`${base}/api/products/${id}`)
  }

  const getCollections = async () => {
    const data = await fetchJson(`${base}/api/collections`)
    return Array.isArray(data) ? data : []
  }

  const createOrder = async (order: {
    productName: string
    productSize?: string
    amount: number
    customer: { fullName: string; phone: string; telegram: string; email: string }
    delivery: { method: string; address: string; deliveryPrice?: number }
  }) => {
    return await $fetch(`${base}/api/orders/create`, {
      method: 'POST',
      body: order
    })
  }

  return { getProducts, getProduct, getCollections, createOrder, base }
}

export const useAdminApi = () => {
  const config = useRuntimeConfig()
  const base = getBase()

  // Без явного API base админ-запросы пойдут по относительному пути
  // и попадут в Nuxt-сервер вместо бэкенда → 404/HTML.
  if (process.client && !config.public.apiBase) {
    console.warn(
      '[useAdminApi] NUXT_PUBLIC_API_BASE не задан. Админ-запросы пойдут по относительному пути и не достигнут бэкенда. Добавь в frontend/.env: NUXT_PUBLIC_API_BASE=http://localhost:3001'
    )
  }

  const getToken = () => {
    if (process.client) return localStorage.getItem('admin_token') || ''
    return ''
  }

  const login = async (username: string, password: string, totp: string) => {
    return await $fetch(`${base}/api/admin/login`, {
      method: 'POST',
      body: { username, password, totp }
    })
  }

  const addProduct = async (product: any) => {
    return await $fetch(`${base}/api/admin/products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: product
    })
  }

  const deleteProduct = async (id: number) => {
    return await $fetch(`${base}/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    })
  }

  const updateProduct = async (id: number, data: any) => {
    return await $fetch(`${base}/api/admin/products/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: data
    })
  }

  const getOrders = async (pendingOnly = false) => {
    const url = pendingOnly ? `${base}/api/orders?pending=1` : `${base}/api/orders`
    const data = await $fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    return Array.isArray(data) ? data : []
  }

  const sendPaymentLink = async (id: number, paymentLink: string, deliveryPrice: number) => {
    return await $fetch(`${base}/api/orders/${id}/send-link`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: { paymentLink, deliveryPrice }
    })
  }

  return { login, addProduct, deleteProduct, updateProduct, getOrders, sendPaymentLink }
}
