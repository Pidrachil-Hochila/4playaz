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

  return { getProducts, getProduct, getCollections, base }
}

export const useAdminApi = () => {
  const base = getBase()

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

  return { login, addProduct, deleteProduct, updateProduct }
}
