// vite.config.ts
import { defineConfig } from "file:///home/hamed/Transport/transport_front/node_modules/vite/dist/node/index.js";
import react from "file:///home/hamed/Transport/transport_front/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { resolve } from "path";
import fs from "fs/promises";
import svgr from "file:///home/hamed/Transport/transport_front/node_modules/@svgr/rollup/dist/index.js";
import { VitePWA } from "file:///home/hamed/Transport/transport_front/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "/home/hamed/Transport/transport_front";
var vite_config_default = defineConfig({
  server: {
    port: 3002
  },
  plugins: [
    svgr(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["logo.png", "pwa/apple-touch-icon.png", "pwa/favicon-32.png"],
      manifest: {
        id: "/",
        name: "Seta\u015F Portal",
        short_name: "Seta\u015F",
        description: "Seta\u015F Portal",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        // App shell only; API calls and sockets always go to the network.
        globPatterns: ["**/*.{js,css,html,woff,woff2}", "pwa/*.png", "*.{svg,png}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      src: resolve(__vite_injected_original_dirname, "src")
    }
  },
  esbuild: {
    loader: "tsx",
    include: /(?:src|tests)\/.*\.[jt]sx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: "load-js-files-as-tsx",
          setup(build) {
            build.onLoad(
              { filter: /src\\.*\.js$/ },
              async (args) => ({
                loader: "tsx",
                contents: await fs.readFile(args.path, "utf8")
              })
            );
          }
        }
      ]
    }
  },
  assetsInclude: ["**/*.xlsx"]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9oYW1lZC9UcmFuc3BvcnQvdHJhbnNwb3J0X2Zyb250XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9oYW1lZC9UcmFuc3BvcnQvdHJhbnNwb3J0X2Zyb250L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2hhbWVkL1RyYW5zcG9ydC90cmFuc3BvcnRfZnJvbnQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHN2Z3IgZnJvbSAnQHN2Z3Ivcm9sbHVwJztcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcblxuICAgIHNlcnZlcjoge1xuICAgICAgICBwb3J0OiAzMDAyLFxuICAgIH0sXG4gICAgcGx1Z2luczogW1xuICAgICAgICBzdmdyKCksXG4gICAgICAgIHJlYWN0KCksXG4gICAgICAgIFZpdGVQV0Eoe1xuICAgICAgICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXG4gICAgICAgICAgICBpbmplY3RSZWdpc3RlcjogJ2F1dG8nLFxuICAgICAgICAgICAgaW5jbHVkZUFzc2V0czogWydsb2dvLnBuZycsICdwd2EvYXBwbGUtdG91Y2gtaWNvbi5wbmcnLCAncHdhL2Zhdmljb24tMzIucG5nJ10sXG4gICAgICAgICAgICBtYW5pZmVzdDoge1xuICAgICAgICAgICAgICAgIGlkOiAnLycsXG4gICAgICAgICAgICAgICAgbmFtZTogJ1NldGFcdTAxNUYgUG9ydGFsJyxcbiAgICAgICAgICAgICAgICBzaG9ydF9uYW1lOiAnU2V0YVx1MDE1RicsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZXRhXHUwMTVGIFBvcnRhbCcsXG4gICAgICAgICAgICAgICAgc3RhcnRfdXJsOiAnLycsXG4gICAgICAgICAgICAgICAgc2NvcGU6ICcvJyxcbiAgICAgICAgICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsXG4gICAgICAgICAgICAgICAgb3JpZW50YXRpb246ICdhbnknLFxuICAgICAgICAgICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjZmZmZmZmJyxcbiAgICAgICAgICAgICAgICB0aGVtZV9jb2xvcjogJyNmZmZmZmYnLFxuICAgICAgICAgICAgICAgIGljb25zOiBbXG4gICAgICAgICAgICAgICAgICAgIHsgc3JjOiAnL3B3YS9pY29uLTE5Mi5wbmcnLCBzaXplczogJzE5MngxOTInLCB0eXBlOiAnaW1hZ2UvcG5nJywgcHVycG9zZTogJ2FueScgfSxcbiAgICAgICAgICAgICAgICAgICAgeyBzcmM6ICcvcHdhL2ljb24tNTEyLnBuZycsIHNpemVzOiAnNTEyeDUxMicsIHR5cGU6ICdpbWFnZS9wbmcnLCBwdXJwb3NlOiAnYW55JyB9LFxuICAgICAgICAgICAgICAgICAgICB7IHNyYzogJy9wd2EvbWFza2FibGUtNTEyLnBuZycsIHNpemVzOiAnNTEyeDUxMicsIHR5cGU6ICdpbWFnZS9wbmcnLCBwdXJwb3NlOiAnbWFza2FibGUnIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB3b3JrYm94OiB7XG4gICAgICAgICAgICAgICAgLy8gQXBwIHNoZWxsIG9ubHk7IEFQSSBjYWxscyBhbmQgc29ja2V0cyBhbHdheXMgZ28gdG8gdGhlIG5ldHdvcmsuXG4gICAgICAgICAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLHdvZmYsd29mZjJ9JywgJ3B3YS8qLnBuZycsICcqLntzdmcscG5nfSddLFxuICAgICAgICAgICAgICAgIG1heGltdW1GaWxlU2l6ZVRvQ2FjaGVJbkJ5dGVzOiA2ICogMTAyNCAqIDEwMjQsXG4gICAgICAgICAgICAgICAgbmF2aWdhdGVGYWxsYmFjazogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrRGVueWxpc3Q6IFsvXlxcL2FwaVxcLy8sIC9eXFwvc29ja2V0XFwuaW9cXC8vXSxcbiAgICAgICAgICAgICAgICBjbGVhbnVwT3V0ZGF0ZWRDYWNoZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgY2xpZW50c0NsYWltOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNraXBXYWl0aW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybFBhdHRlcm46ICh7IHJlcXVlc3QsIHNhbWVPcmlnaW4gfSkgPT4gc2FtZU9yaWdpbiAmJiByZXF1ZXN0LmRlc3RpbmF0aW9uID09PSAnaW1hZ2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2ltYWdlcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAyMDAsIG1heEFnZVNlY29uZHM6IDMwICogMjQgKiA2MCAqIDYwIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9KSxcbiAgICBdLFxuICAgIHJlc29sdmU6IHtcbiAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAgIHNyYzogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKSxcbiAgICAgICAgfSxcbiAgICB9LFxuICAgIGVzYnVpbGQ6IHtcbiAgICAgICAgbG9hZGVyOiAndHN4JyxcbiAgICAgICAgaW5jbHVkZTogLyg/OnNyY3x0ZXN0cylcXC8uKlxcLltqdF1zeD8kLyxcbiAgICAgICAgZXhjbHVkZTogW10sXG4gICAgfSxcbiAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgICAgZXNidWlsZE9wdGlvbnM6IHtcbiAgICAgICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdsb2FkLWpzLWZpbGVzLWFzLXRzeCcsXG4gICAgICAgICAgICAgICAgICAgIHNldHVwKGJ1aWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWlsZC5vbkxvYWQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBmaWx0ZXI6IC9zcmNcXFxcLipcXC5qcyQvIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXN5bmMgKGFyZ3MpID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRlcjogJ3RzeCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRzOiBhd2FpdCBmcy5yZWFkRmlsZShhcmdzLnBhdGgsICd1dGY4JyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuXG4gICAgYXNzZXRzSW5jbHVk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
