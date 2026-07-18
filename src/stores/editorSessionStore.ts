import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useLogStore } from '@/stores/logStore';

export type EditorTarget =
    | { kind: 'message'; chunkId: string; messageId: string }
    | { kind: 'chunkName'; chunkId: string }
    | { kind: 'projectName' };

export const useEditorSessionStore = defineStore('editorSession', () => {
    const logStore = useLogStore();
    const activeTarget = ref<EditorTarget | null>(null);

    function startEditing(target: EditorTarget) {
        activeTarget.value = target;
    }

    function stopEditing() {
        activeTarget.value = null;
    }

    watch(
        () => {
            const target = activeTarget.value;
            if (!target || target.kind === 'projectName') return true;
            if (target.kind === 'chunkName') {
                return Boolean(logStore.findChunkById(target.chunkId));
            }
            return logStore.messagesById.has(target.messageId);
        },
        (targetExists) => {
            if (!targetExists) stopEditing();
        },
    );

    return { activeTarget, startEditing, stopEditing };
});
