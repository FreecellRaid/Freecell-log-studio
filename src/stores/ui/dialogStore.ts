import { computed, readonly, ref } from 'vue';
import { defineStore } from 'pinia';
import type { DialogName } from '@/types/editorLayout';

export const useDialogStore = defineStore('dialogs', () => {
    const stack = ref<DialogName[]>([]);
    const top = computed(() => stack.value.at(-1) ?? null);
    const isBlocking = computed(() => stack.value.length > 0);
    function open(name: DialogName) {
        stack.value = [...stack.value.filter((item) => item !== name), name];
    }
    function close(name: DialogName) {
        stack.value = stack.value.filter((item) => item !== name);
    }
    function closeTop() {
        if (top.value) close(top.value);
    }
    function isOpen(name: DialogName) {
        return stack.value.includes(name);
    }
    return {
        stack: readonly(stack),
        top,
        isBlocking,
        open,
        close,
        closeTop,
        isOpen,
    };
});
