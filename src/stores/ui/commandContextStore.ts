import { defineStore } from 'pinia';
import { readonly, shallowRef } from 'vue';
import type { CommandContext } from '@/types/commandContext';

export const useCommandContextStore = defineStore('commandContext', () => {
    const current = shallowRef<CommandContext>({
        area: 'empty',
        windowId: 'defaultView',
    });

    function activate(context: CommandContext) {
        current.value = { ...context };
    }

    return { current: readonly(current), activate };
});
