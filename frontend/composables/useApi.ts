export const useApi = () => {
  const config = useRuntimeConfig()
  const base = config.public.apiBase

  const getProducts = async (category?: string) => {
    const url = category
      ? `${base}/api/products?category=${encodeURIComponent(category)}`
      : `${base}/api/products`
    return await $fetch(url)
  }

  const getProduct = async (id: number) => {
    return await $fetch(`${base}/api/products/${id}`)
  }

  return { getProducts, getProduct, base }
}

export const useAdminApi = () => {
  const config = useRuntimeConfig()
  const base = config.public.apiBase

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
