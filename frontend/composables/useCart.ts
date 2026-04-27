import { ref, computed } from 'vue'

export interface CartItem {
  id: string | number
  cartKey: string
  name: string
  price: number
  image?: string
  quantity: number
  category?: string
  size?: string
}

const cartItems = ref<CartItem[]>([])
const cartOpen = ref(false)

export const useCart = () => {
  const totalItems = computed(() =>
    cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  // Стоимость товаров
  const subtotalPrice = computed(() =>
    cartItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )

  const shippingPrice = computed(() => 0)
  const totalPrice = computed(() => subtotalPrice.value)
  const freeShipping = computed(() => true)
  const amountToFreeShipping = computed(() => 0)

  const addToCart = (product: any) => {
    const cartKey = `${product.id}-${product.size || ''}`
    const existing = cartItems.value.find(item => item.cartKey === cartKey)
    if (existing) {
      existing.quantity += 1
    } else {
      cartItems.value.push({
        id: product.id,
        cartKey,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        size: product.size,
        quantity: 1
      })
    }
  }

  const removeFromCart = (cartKey: string) => {
    const idx = cartItems.value.findIndex(item => item.cartKey === cartKey)
    if (idx !== -1) cartItems.value.splice(idx, 1)
  }

  const updateQuantity = (cartKey: string, quantity: number) => {
    const item = cartItems.value.find(item => item.cartKey === cartKey)
    if (item) {
      if (quantity <= 0) removeFromCart(cartKey)
      else item.quantity = quantity
    }
  }

  const clearCart = () => {
    cartItems.value = []
  }

  const openCart = () => { cartOpen.value = true }
  const closeCart = () => { cartOpen.value = false }

  return {
    cartItems,
    cartOpen,
    totalItems,
    subtotalPrice,
    shippingPrice,
    totalPrice,
    freeShipping,
    amountToFreeShipping,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    openCart,
    closeCart
  }
}
