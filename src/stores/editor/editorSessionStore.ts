import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useLogStore } from '@/stores/project/logStore';
import type { Message } from '@/types/log';
export type MessageDraft = Pick<
    Message,
    | 'playerName'
    | 'account'
    | 'role'
    | 'content'
    | 'note'
    | 'isOoc'
    | 'isCommand'
>;
export type EditorTarget =
    | { kind: 'message'; chunkId: string; messageId: string }
    | { kind: 'chunkName'; chunkId: string }
    | { kind: 'projectName' };

export const useEditorSessionStore = defineStore('editorSession', () => {
    const logStore = useLogStore();
    const activeTarget = ref<EditorTarget | null>(null);

    const editingPaneId = ref<string | null>(null);
    const messageDraft = ref<MessageDraft | null>(null);

    function startEditing(target: EditorTarget, paneId?: string) {
        if (
            target.kind === 'message' &&
            logStore.messagesById.get(target.messageId)?.chunkId !==
                target.chunkId
        )
            return;
        const previous = activeTarget.value;
        const sameMessage =
            target.kind === 'message' &&
            previous?.kind === 'message' &&
            previous.chunkId === target.chunkId &&
            previous.messageId === target.messageId;
        if (!sameMessage) {
            messageDraft.value = null;
            if (target.kind === 'message') {
                const message = logStore.messagesById.get(target.messageId);
                if (!message || message.chunkId !== target.chunkId) return;
                const {
                    playerName,
                    account,
                    role,
                    content,
                    note,
                    isOoc,
                    isCommand,
                } = message;
                messageDraft.value = {
                    playerName,
                    account,
                    role,
                    content,
                    note,
                    isOoc,
                    isCommand,
                };
            }
            activeTarget.value = target;
        }
        editingPaneId.value = paneId ?? null;
    }

    function updateMessageDraft<K extends keyof MessageDraft>(
        field: K,
        value: MessageDraft[K],
    ) {
        if (messageDraft.value) messageDraft.value[field] = value;
    }

    function stopEditing() {
        activeTarget.value = null;
        messageDraft.value = null;
        editingPaneId.value = null;
    }

    watch(
        () => {
            const target = activeTarget.value;
            if (!target || target.kind === 'projectName') return true;
            if (target.kind === 'chunkName') {
                return Boolean(logStore.findChunkById(target.chunkId));
            }
            return (
                logStore.messagesById.get(target.messageId)?.chunkId ===
                target.chunkId
            );
        },
        (targetExists) => {
            if (!targetExists) stopEditing();
        },
    );

    return {
        activeTarget,
        editingPaneId,
        messageDraft,
        updateMessageDraft,
        startEditing,
        stopEditing,
    };
});
