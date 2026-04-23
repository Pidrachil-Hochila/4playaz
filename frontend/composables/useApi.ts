const getBase = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string
  // When apiBase is empty (GitHub Pages SSG mode), fall back to app.baseURL
  // so fetch('/4playaz/api/products') resolves correctly under the sub-path.
  const appBase = (config.app?.baseURL ?? '/').replace(/\/$/, '')
  return apiBase || appBase
}

export const useApi = () => {
  const base = getBase()

  const getProducts = async (category?: string) => {
    const url = category
      ? `${base}/api/products?category=${encodeURIComponent(category)}`
      : `${base}/api/products`
    return await $fetch(url)
  }

  const getProduct = async (id: number) => {
    return await $fetch(`${base}/api/products/${id}`)
  }

  const getCollections = async () => {
    return await $fetch(`${base}/api/collections`)
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
