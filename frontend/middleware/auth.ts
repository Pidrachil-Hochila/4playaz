export default defineNuxtRouteMiddleware((to) => {
  if (to.path.startsWith('/admin') && to.path !== '/admin/login') {
    if (process.client) {
      const token = localStorage.getItem('admin_token')
      if (!token) {
        return navigateTo('/admin/login')
      }
    }
  }
})
