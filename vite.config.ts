import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const paket = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

// Pfad unter GitHub Pages (Repo-Name). Ohne ihn findet die installierte App ihre Dateien nicht.
const base = '/CQB-APP/';

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(paket.version) },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'data/*.json'],
      manifest: {
        name: 'CQB Charakterbogen',
        short_name: 'CQB',
        description: 'Digitaler Charakterbogen für das Rollenspiel CQB',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#16181d',
        theme_color: '#16181d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        // Spieldaten gehören zum Offline-Paket, damit die App ohne Netz startet.
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest,woff2}']
      }
    })
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});
