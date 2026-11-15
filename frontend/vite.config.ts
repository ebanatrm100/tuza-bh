import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeManifestIcons: false,
      manifest: {
        id: '/',
        name: 'TUZA BIBLE+HYMNAL',
        short_name: 'TUZA Bible',
        description: 'Offline Bible and Hymnal for REGIS COMMUNITY',
        lang: 'rw',
        dir: 'ltr',
        theme_color: '#5B21B6',
        background_color: '#431888',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        scope: '/',
        start_url: '/',
        categories: ['books', 'education', 'lifestyle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          { name: 'Bible', short_name: 'Bible', url: '/bible', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Hymnal', short_name: 'Hymnal', url: '/hymns', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        globIgnores: ['**/manifest.webmanifest'],
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:10000'
    }
  }
});
