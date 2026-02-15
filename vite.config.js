import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/ascii-art-generator/',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: 'esbuild',
    },
})
