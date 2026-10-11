import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

export const useImportSettingsStore = defineStore('importSettings', () => {
    // null 表示尚未选择，false 表示用户明确选择保留括号。
    const stripOocParentheses = useLocalStorage<boolean | null>(
        'freecell-log-studio.import.stripOocParentheses',
        null,
        {
            flush: 'sync',
            serializer: {
                read: (value) =>
                    value === 'true' ? true : value === 'false' ? false : null,
                write: (value) => String(value),
            },
        },
    );

    function resolveStripOocParentheses(): boolean {
        if (stripOocParentheses.value === null) {
            stripOocParentheses.value = window.confirm(
                '导入时是否删除场外发言首尾的中文括号（）和英文括号()？\n\n点击“确定”删除，点击“取消”保留。本弹窗仅展示一次，后续可在左下角的偏好设置中更改。',
            );
        }
        return stripOocParentheses.value;
    }

    return { stripOocParentheses, resolveStripOocParentheses };
});
