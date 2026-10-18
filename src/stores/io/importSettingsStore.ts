import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

export const useImportSettingsStore = defineStore('importSettings', () => {
    const autoCloseRemoteImport = useLocalStorage<boolean>(
        'freecell-log-studio.import.autoCloseRemoteImport',
        true,
        {
            flush: 'sync',
            serializer: {
                read: (value) => value !== 'false',
                write: (value) => String(value),
            },
        },
    );
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

    return { stripOocParentheses, autoCloseRemoteImport };
});
