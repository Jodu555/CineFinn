// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: [
    '@fortawesome/fontawesome-svg-core/styles.css',
    '~/assets/main.scss'
  ],
  runtimeConfig: {
    public: {
      apiBaseURL: 'http://localhost:3000'
    }
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['color-functions', 'global-builtin', 'import', 'color-functions']
        }
      }
    }
  },
  app: {
    head: {
      bodyAttrs: {
        'data-bs-theme': 'dark'
      },
      // script: [
      //   {
      //     src: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js',
      //     tagPosition: 'bodyClose'
      //   }
      // ]
    }
  },
  modules: ['@pinia/nuxt', '@nuxt/image'],
});