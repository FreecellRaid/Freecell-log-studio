import { defineStore } from 'pinia';
import { readonly, shallowRef } from 'vue';
import {
    sameCommandContext,
    selectionScopeForCommand,
    type CommandContext,
} from '@/types/commandContext';
import { useSelectionStore } from '@/stores/editor/selectionStore';

export const useCommandContextStore = defineStore('commandContext', () => {
    const selection = useSelectionStore();
    const current = shallowRef<CommandContext>({
        area: 'empty',
        paneId: '',
    });

    function activate(context: CommandContext) {
        const scope = selectionScopeForCommand(context);
        if (scope) selection.activateScope(scope);
        if (sameCommandContext(current.value, context)) return;
        current.value = { ...context };
    }

    return { current: readonly(current), activate };
});
