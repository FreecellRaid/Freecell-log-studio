import { defineConfig } from 'vite';
import path from 'path';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue()],
    base: '/Freecell-log-studio/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
