import { readFileSync } from 'fs';
import { resolve } from 'path';

import packageJSON from './package.json';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: { enabled: true },
    css: [
        'bootstrap/dist/css/bootstrap.min.css',
        '@fortawesome/fontawesome-svg-core/styles.css',
        '~/assets/main.scss',
    ],
    runtimeConfig: {
        public: {
            apiBaseURL: 'http://localhost:3000',
            clientVersion: packageJSON.version
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
        optimizeDeps: {
            include: [
                '@fortawesome/vue-fontawesome',
                '@fortawesome/free-solid-svg-icons',
                '@fortawesome/free-regular-svg-icons',
                '@fortawesome/fontawesome-svg-core'
            ]
        },

        ssr: {
            noExternal: ['@fortawesome/vue-fontawesome']
        }
    },
    build: {
        transpile: [
            '@fortawesome/vue-fontawesome',
            '@fortawesome/free-solid-svg-icons',
            '@fortawesome/free-regular-svg-icons'
        ]
    },
    app: {
        head: {
            bodyAttrs: {
                'data-bs-theme': 'dark'
            },
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
