import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		{
			name: 'inject',
			transformIndexHtml() {
				return [
					{ injectTo: 'body', attrs: { 'data-bs-theme': 'dark' } },
					{
						tag: 'script',
						attrs: { src: 'https://docs.jodu555.de/utils/utils.js', defer: true },
					},
					{
						tag: 'script',
						attrs: { src: 'https://docs.jodu555.de/utils/networking.js', defer: true },
					},
				];
			},
		},
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
});
