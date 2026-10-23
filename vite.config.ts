import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs/promises';
import svgr from '@svgr/rollup';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({

    server: {
        host: '0.0.0.0',
        port: 3002,
        // Vite rejects the HMR websocket from unknown hosts; through ngrok the client then reloads the page in a loop.
        allowedHosts: ['.ngrok-free.app', '.ngrok.app', '.trycloudflare.com'],
        proxy: {
            '/socket.io': {
                target: 'http://127.0.0.1:3006',
                changeOrigin: true,
                ws: true,
            },
            '/api': {
                target: 'http://127.0.0.1:3006',
                changeOrigin: true,
            },
            // The second backend (company channels, AI agent). Through the dev server rather than straight to
            // localhost:3001: same origin (no CORS), and it works from a phone or ngrok too. A production server
            // needs the same /tarabari-api route to that backend (endpoints.json tarabariurl).
            '/tarabari-api': {
                target: 'http://127.0.0.1:3001',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/tarabari-api/, '/api'),
            },
        },
    },
    preview: {
        allowedHosts: ['.ngrok-free.app', '.ngrok.app', '.trycloudflare.com'],
    },
    plugins: [
        basicSsl(),
        svgr(),
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            devOptions: {
                enabled: true,
                navigateFallback: 'index.html',
                navigateFallbackAllowlist: [/^\/$/, /^\/auth\//, /^\/driver(?:\/|$)/],
            },
            injectRegister: 'auto',
            // Send cookies with the manifest request; tunnels like ngrok-free gate requests behind a cookie.
            useCredentials: true,
            includeAssets: ['favicon.ico', 'pwa/trabot-apple-touch-icon.png', 'pwa/trabot-favicon-64.png', 'pwa/logo-horizontal.png'],
            manifest: {
                id: '/',
                name: 'ترابوت | دستیار هوشمند حمل‌ونقل',
                short_name: 'ترابوت',
                description: 'ترابوت، دستیار هوشمند حمل‌ونقل',
                lang: 'fa',
                dir: 'rtl',
                start_url: '/',
                scope: '/',
                // Hides Android's status and navigation bars too; iOS falls back to standalone.
                display: 'fullscreen',
                display_override: ['fullscreen', 'standalone'],
                orientation: 'any',
                background_color: '#ffffff',
                theme_color: '#F5761A',
                icons: [
                    { src: '/pwa/trabot-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: '/pwa/trabot-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: '/pwa/trabot-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            workbox: {
                // phone notifications: the push and notification-click handlers (public/push-sw.js)
                importScripts: ['push-sw.js'],
                // App shell only; API calls and sockets always go to the network.
                // Install the shell first; load and cache other routes when they are visited.
                globPatterns: ['**/*.{css,html,woff2}', 'assets/index-*.js', 'pwa/*.png', '*.{svg,png}'],
                maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api\//, /^\/tarabari-api\//, /^\/socket\.io\//],
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: true,
                runtimeCaching: [
                    {
                        urlPattern: ({ request, sameOrigin, url }) =>
                            sameOrigin && request.destination === 'script' && url.pathname.startsWith('/assets/'),
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'app-scripts',
                            expiration: { maxEntries: 250, maxAgeSeconds: 30 * 24 * 60 * 60 },
                        },
                    },
                    {
                        urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'image',
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'images',
                            expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            src: resolve(__dirname, 'src'),
        },
    },
    esbuild: {
        loader: 'tsx',
        include: /(?:src|tests)\/.*\.[jt]sx?$/,
        exclude: [],
    },
    optimizeDeps: {
        esbuildOptions: {
            plugins: [
                {
                    name: 'load-js-files-as-tsx',
                    setup(build) {
                        build.onLoad(
                            { filter: /src\\.*\.js$/ },
                            async (args) => ({
                                loader: 'tsx',
                                contents: await fs.readFile(args.path, 'utf8'),
                            })
                        );
                    },
                },
            ],
        },
    },


    assetsInclude: ['**/*.xlsx'],
});
