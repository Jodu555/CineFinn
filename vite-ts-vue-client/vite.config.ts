import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import VueDevTools from 'vite-plugin-vue-devtools';

const favicons = [
	{
		tag: 'link',
		attrs: { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon/favicon-16x16.png' },
	},
	{
		tag: 'link',
		attrs: { rel: 'apple-touch-icon', sizes: '57x57', href: '/favicon/apple-icon-57x57.png' },
	},

	{
		tag: 'link',
		attrs: { rel: 'apple-touch-icon', sizes: '60x60', href: '/favicon/apple-icon-60x60.png' },
	},

	{
		tag: 'link',
		attrs: { rel: 'apple-touch-icon', sizes: '72x72', href: '/favicon/apple-icon-72x72.png' },
	},

	{
		tag: 'link',
		attrs: { rel: 'apple-touch-icon', sizes: '76x76', href: '/favicon/apple-icon-76x76.png' },
	},

	{
		tag: 'link',
		attrs: { rel: 'apple-touch-icon', sizes: '114x114', href: '/favicon/apple-icon-114x114.png' },
	},

	{
		tag: 'link',
		attrs: { rel: 'apple-touch-icon', sizes: '120x120', href: '/favicon/apple-icon-120x120.png' },
	},

	{
		tag: 'link',
		attrs: { rel: 'apple-touch-icon', sizes: '144x144', href: '/favicon/apple-icon-144x144.png' },
	},

	{
		tag: 'link',
		attrs: { rel: 'apple-touch-icon', sizes: '152x152', href: '/favicon/apple-icon-152x152.png' },
	},

	{
		tag: 'link',
		attrs: { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicon/apple-icon-180x180.png' },
	},

	{
		tag: 'link',
		attrs: { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/favicon/android-icon-192x192.png' },
	},

	{
		tag: 'link',
		attrs: { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon/favicon-32x32.png' },
	},

	{
		tag: 'link',
		attrs: { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon/favicon-96x96.png' },
	},
	{
		tag: 'link',
		attrs: { rel: 'manifest', href: '/favicon/manifest.json' },
	},
];

const bootstrapAndAccessibiliity = [
	{
		tag: 'meta',
		attrs: { name: 'viewport', content: 'width=device-width,initial-scale=1.0' },
	},
	{
		tag: 'meta',
		attrs: {
			'http-equiv': 'X-UA-Compatible',
			content: 'IE=edge',
		},
	},
	{
		tag: 'meta',
		attrs: {
			name: 'msapplication-TileColor',
			content: '#ffffff',
		},
	},
	{
		tag: 'meta',
		attrs: {
			name: 'msapplication-TileImage',
			content: '/favicon/ms-icon-144x144.png',
		},
	},
	{
		tag: 'meta',
		attrs: {
			name: 'theme-color',
			content: '#ffffff',
		},
	},
];

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		VueDevTools(),
		{
			name: 'inject',
			transformIndexHtml() {
				return [
					...favicons,
					...bootstrapAndAccessibiliity,
					{
						tag: 'title',
						children: 'Cinema - Jodu555',
					},
					{
						tag: 'meta',
						attrs: {
							name: 'description',
							content:
								'Jetzt Staffel 1  und weitere Staffeln komplett als gratis HD-Stream mehrsprachig online ansehen. ✓ 100% Kostenlos ✓ Online ✓ 100+ Animes',
						},
					},
					{
						tag: 'meta',

						attrs: {
							name: 'keywords',
							content:
								'Stream, Staffel 1, Animes, Season 1, Stream, ansehen, watch, kostenlos, free, Anime, Amazon Video, ganze Anime Episode, complete Anime Episode, complete, komplett',
						},
					},
					// {
					// 	tag: 'script',
					// 	attrs: { src: 'https://docs.jodu555.de/utils/utils.js', defer: true },
					// },
					// {
					// 	tag: 'script',
					// 	attrs: { src: 'https://docs.jodu555.de/utils/networking.js', defer: true },
					// },
				];
			},
		},
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	esbuild: {
		sourcemap: true,
	},
	build: {
		sourcemap: true,
	},
	css: {
		devSourcemap: true,
	},
});
