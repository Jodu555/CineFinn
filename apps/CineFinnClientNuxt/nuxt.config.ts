import { readFileSync } from 'fs';
import { resolve } from 'path';
const devBootstrapCss = process.env.NODE_ENV === 'development'
  ? readFileSync(resolve(process.cwd(), 'node_modules/bootstrap/dist/css/bootstrap.min.css'), 'utf8')
  : null;

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: [
    'bootstrap/dist/css/bootstrap.min.css',
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
    },
    // ... your existing scss config ...

    // 1. Force Vite to pre-bundle these dependencies.
    // This helps ensure the imports are not treated as external and are preserved.
    optimizeDeps: {
      include: [
        '@fortawesome/vue-fontawesome',
        '@fortawesome/free-solid-svg-icons',
        '@fortawesome/free-regular-svg-icons',
        '@fortawesome/fontawesome-svg-core'
      ]
    },

    // 2. Specifically for SSR: Ensure the FontAwesome component 
    // is not treated as an external module on the server.
    // This forces the component code into the server bundle, 
    // ensuring it can access the library correctly.
    ssr: {
      noExternal: ['@fortawesome/vue-fontawesome']
    }
  },

  // Optional: You can also use the legacy 'transpile' which helps 
  // ensure everything is compiled for the Node.js server environment.
  build: {
    transpile: [
      '@fortawesome/vue-fontawesome',
      '@fortawesome/free-solid-svg-icons',
      '@fortawesome/free-regular-svg-icons'
    ]
  },
  app: {
    head: {
      style: devBootstrapCss ? [{ children: devBootstrapCss } as any] : [],
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
  prometheus: {
    verbose: true,
    prefix: 'cinefinn_client_',
  },
  umami: {
    enabled: true,
    id: '3fdb9fab-ac24-4d0f-afc7-a332f79b50f6',
    host: 'https://umami.jodu555.de',
    autoTrack: true,
    useDirective: true,
    ignoreLocalhost: false,
    // proxy: 'cloak',
    // excludeQueryParams: false,
    // domains: ['cool-site.app', 'my-space.site'],
    // customEndpoint: '/my-custom-endpoint',
    // logErrors: true,
  },
  modules: [
    '@pinia/nuxt',
    '@nuxt/image',
    '@artmizu/nuxt-prometheus',
    'vue3-carousel-nuxt',
    '@formkit/auto-animate',
    'nuxt-umami'
  ],
});
