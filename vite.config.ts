import { defineConfig } from 'vite';
import path from 'path';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vite.dev/config/
export default defineConfig(() => {
    const isSingleFile = process.env.VITE_SINGLE_FILE === 'true';
    return {
        plugins: [vue(), ...(isSingleFile ? [viteSingleFile()] : [])],
        base: '/Freecell-log-studio/',
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        build: isSingleFile
            ? {
                  rollupOptions: {
                      output: {
                          inlineDynamicImports: true,
                          manualChunks: undefined,
                      },
                  },
                  assetsInlineLimit: 100000000,
                  cssCodeSplit: false,
              }
            : {},
    };
});
