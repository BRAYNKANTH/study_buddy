import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['logo.jpeg', 'favicon.ico'],
            manifest: {
                name: 'Theebam Study Buddy',
                short_name: 'Study Buddy',
                description: 'Tuition management for students, parents and tutors — Theebam Education Centre',
                theme_color: '#1e3a8a',
                background_color: '#f8fafc',
                display: 'standalone',
                orientation: 'portrait-primary',
                scope: '/',
                start_url: '/',
                categories: ['education', 'productivity'],
                icons: [
                    {
                        src: 'logo.jpeg',
                        sizes: '192x192',
                        type: 'image/jpeg'
                    },
                    {
                        src: 'logo.jpeg',
                        sizes: '512x512',
                        type: 'image/jpeg'
                    },
                    {
                        src: 'logo.jpeg',
                        sizes: '512x512',
                        type: 'image/jpeg',
                        purpose: 'any maskable'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^\/api\//,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: { maxEntries: 50, maxAgeSeconds: 300 },
                            networkTimeoutSeconds: 10
                        }
                    }
                ]
            }
        })
    ],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            }
        }
    }
})
