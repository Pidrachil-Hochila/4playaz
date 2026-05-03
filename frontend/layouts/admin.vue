<template>
  <div class="admin-wrapper">
    <aside class="admin-sidebar">
      <div class="sidebar-logo">
        <span class="logo-text">4PLAYAZ</span>
        <span class="admin-badge">ADMIN</span>
      </div>
      <nav class="sidebar-nav">
        <NuxtLink to="/admin" exact class="nav-item">
          <span class="nav-icon">◈</span>
          <span>Дашборд</span>
        </NuxtLink>
        <NuxtLink to="/admin/orders" class="nav-item">
          <span class="nav-icon">◎</span>
          <span>Заказы</span>
        </NuxtLink>
        <NuxtLink to="/admin/products" class="nav-item">
          <span class="nav-icon">◉</span>
          <span>Товары</span>
        </NuxtLink>
        <NuxtLink to="/admin/add" class="nav-item">
          <span class="nav-icon">⊕</span>
          <span>Добавить товар</span>
        </NuxtLink>
      </nav>
      <div class="sidebar-footer">
        <button class="logout-btn" @click="logout">
          <span>✕</span> Выйти
        </button>
      </div>
    </aside>

    <div class="admin-content-area">
      <header class="admin-topbar">
        <div class="topbar-title">
          <slot name="title">Панель управления</slot>
        </div>
        <div class="topbar-user">
          <span class="user-badge">ADMIN</span>
        </div>
      </header>
      <main class="admin-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from '#app'

definePageMeta({ middleware: 'auth' })

const logout = () => {
  localStorage.removeItem('admin_token')
  navigateTo('/admin/login')
}
</script>

<style scoped>
.admin-wrapper {
  display: flex;
  min-height: 100vh;
  background: var(--black);
}

/* ─── SIDEBAR ─── */
.admin-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--deep);
  border-right: 1px solid var(--border-red);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
}

.sidebar-logo {
  padding: 28px 24px;
  border-bottom: 1px solid var(--border-red);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.logo-text {
  font-family: var(--font-gothic);
  font-size: 26px;
  color: var(--white);
  text-shadow: 0 0 20px var(--red-glow);
}
.admin-badge {
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.3em;
  color: var(--red);
  border: 1px solid var(--red-deep);
  padding: 3px 8px;
  width: fit-content;
}

.sidebar-nav {
  flex: 1;
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  font-family: var(--font-cinzel);
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--mid);
  transition: all 0.2s;
  border-left: 2px solid transparent;
}
.nav-item:hover {
  color: var(--white);
  background: rgba(255,255,255,0.03);
  border-left-color: var(--red);
}
.nav-item.router-link-active {
  color: var(--red-bright);
  border-left-color: var(--red-bright);
  background: rgba(192, 57, 43, 0.08);
}
.nav-icon { font-size: 14px; width: 18px; }

.sidebar-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border);
}
.logout-btn {
  background: none;
  border: 1px solid var(--border-red);
  color: var(--red);
  font-family: var(--font-cinzel);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}
.logout-btn:hover {
  background: var(--red-deep);
  border-color: var(--red);
  color: var(--white);
}

/* ─── MAIN ─── */
.admin-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.admin-topbar {
  background: var(--deep);
  border-bottom: 1px solid var(--border);
  padding: 0 32px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 10;
}
.topbar-title {
  font-family: var(--font-cinzel);
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--off-white);
}
.user-badge {
  font-family: var(--font-cinzel);
  font-size: 8px;
  letter-spacing: 0.25em;
  color: var(--red);
  border: 1px solid var(--red-deep);
  padding: 4px 10px;
}
.admin-main {
  padding: 32px;
  flex: 1;
}

@media (max-width: 768px) {
  .admin-wrapper { flex-direction: column; }

  .admin-sidebar {
    width: 100%;
    height: auto;
    flex-direction: row;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
    border-right: none;
    border-bottom: 1px solid var(--border-red);
  }
  .sidebar-logo {
    padding: 10px 14px;
    border-bottom: none;
    border-right: 1px solid var(--border-red);
    flex-direction: row;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .logo-text { font-size: 16px; }
  .admin-badge { display: none; }

  .sidebar-nav {
    flex-direction: row;
    padding: 0;
    flex: 1;
    overflow-x: auto;
    gap: 0;
  }
  .nav-item {
    padding: 12px 10px;
    font-size: 7px;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    border-left: none;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    flex: 1;
    justify-content: center;
  }
  .nav-item:hover { border-left-color: transparent; border-bottom-color: var(--red); background: rgba(255,255,255,0.03); }
  .nav-item.router-link-active { border-left-color: transparent; border-bottom-color: var(--red-bright); }
  .nav-icon { font-size: 16px; width: auto; }

  .sidebar-footer {
    border-top: none;
    border-left: 1px solid var(--border);
    padding: 8px 10px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .logout-btn { padding: 8px 10px; font-size: 8px; white-space: nowrap; }

  .admin-topbar { padding: 0 16px; height: 44px; }
  .topbar-title { font-size: 10px; }
  .admin-main { padding: 14px; }
}
</style>
