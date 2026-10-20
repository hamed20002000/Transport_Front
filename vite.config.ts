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
        },
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
            includeAssets: ['logo.png', 'pwa/apple-touch-icon.png', 'pwa/favicon-32.png'],
            manifest: {
                id: '/',
                name: 'Setaş Portal',
                short_name: 'Setaş',
                description: 'Setaş Portal',
                start_url: '/',
                scope: '/',
                // Hides Android's status and navigation bars too; iOS falls back to standalone.
                display: 'fullscreen',
                display_override: ['fullscreen', 'standalone'],
                orientation: 'any',
                background_color: '#F4F7FC',
                theme_color: '#ffffff',
                icons: [
                    { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: '/pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            workbox: {
                // App shell only; API calls and sockets always go to the network.
                globPatterns: ['**/*.{js,css,html,woff,woff2}', 'pwa/*.png', '*.{svg,png}'],
                maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: true,
                runtimeCaching: [
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
