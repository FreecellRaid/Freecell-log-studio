import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

export const useImportSettingsStore = defineStore('importSettings', () => {
    const stripOocParentheses = useLocalStorage<boolean>(
        'freecell-log-studio.import.stripOocParentheses',
        false,
        {
            flush: 'sync',
            serializer: {
                read: (value) => value === 'true',
                write: (value) => String(value),
            },
        },
    );

    return { stripOocParentheses };
});
