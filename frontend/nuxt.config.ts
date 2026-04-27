export default defineNuxtConfig({
  devtools: { enabled: true },

  // SPA mode: avoids SSR/hydration issues on GitHub Pages static hosting
  ssr: false,

  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: '4PLAYAZ — STORE',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      script: [
        {
          src: 'https://cdn.jsdelivr.net/npm/@cdek-it/widget@3',
          type: 'text/javascript',
          charset: 'utf-8',
        }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: 'favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=Barlow+Condensed:wght@300;400;500;600&display=swap'
        }
      ]
    }
  },

  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },

  routeRules: {
    '/admin/**': { ssr: false },
  },

  nitro: {
    prerender: {
      // Pre-render API routes as static JSON files for GitHub Pages
      routes: ['/api/products', '/api/collections'],
    },
  },

  runtimeConfig: {
    public: {
      // Use ?? so empty string from env var is preserved (not replaced by fallback)
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '',
      yandexApiKey: process.env.NUXT_PUBLIC_YANDEX_API_KEY || '',
      cdekServicePath: process.env.NUXT_PUBLIC_CDEK_SERVICE_PATH || '',
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || 'https://gmmtxvobjnmdpryhsrpu.supabase.co',
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtbXR4dm9iam5tZHByeWhzcnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTA1NDMsImV4cCI6MjA5MTY2NjU0M30.CvrAD3_2JffSxEhdrZhQinw8RyOmc_j1p89mgQw3y80',
    }
  },

  css: ['~/assets/css/global.css'],
  compatibilityDate: '2024-01-01',
  modules: []
})
