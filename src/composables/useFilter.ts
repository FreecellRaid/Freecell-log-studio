import { computed } from 'vue';
import type { Message, MessageFilter } from '@/types/log';
import { matchesMessageFilter } from '@/editor/filter';
import { useLogStore } from '@/stores/logStore';
import { useWindowStore } from '@/stores/windowStore';
import { useSelectionStore } from '@/stores/selectionStore';

// 暂时不改这里的接口，后面再单独分离
export function useFilter(ownerId?: string) {
    const logStore = useLogStore();
    const windowStore = useWindowStore();
    const selectionStore = useSelectionStore();

    const effectiveId = computed(() => {
        if (ownerId) return ownerId;
        const stack = windowStore.focusStack;
        for (let i = stack.length - 1; i >= 0; i--) {
            const windowId = stack[i];
            const win = windowStore.openWindows.get(windowId);
            if (!win || win.windowType === 'modal') continue;
            return windowId;
        }
        return 'defaultView';
    });
    const selectedMessageIds = computed(() =>
        selectionStore.getSelectedIds(effectiveId.value, 'message'),
    );

    const selectedChunkIds = computed(() =>
        selectionStore.getSelectedIds(effectiveId.value, 'chunk'),
    );

    const lastSelectedMessageId = computed(
        () =>
            selectionStore.getState(effectiveId.value, 'message')
                .lastSelectedId || null,
    );

    const hasSelection = computed(
        () =>
            selectedMessageIds.value.size > 0 ||
            selectedChunkIds.value.size > 0,
    );

    const selectedMessagesCount = computed(() => selectedMessageIds.value.size);

    // 获取选中的 Message 对象列表
    const selectedMessages = computed(() => {
        const ids = selectedMessageIds.value;
        if (ids.size === 0) return [];
        // 优化：从 logStore 中查找
        const result: Message[] = [];
        for (const doc of logStore.documents) {
            for (const chunk of doc.chunks) {
                for (const msg of chunk.messages) {
                    if (ids.has(msg.messageId)) result.push(msg);
                }
            }
        }
        return result;
    });

    // 处理消息点击（集成 Sft/Cmd）
    function handleMessageClickSelection(
        event: MouseEvent,
        messageId: string,
        messages: Message[],
    ) {
        selectionStore.handleEventSelection(
            effectiveId.value,
            'message',
            event,
            messageId,
            messages,
            (m) => m.messageId,
        );
    }

    function toggleMessageSelection(messageId: string) {
        const current = selectedMessageIds.value;
        if (current.has(messageId)) {
            selectionStore.deselect(effectiveId.value, 'message', messageId);
        } else {
            selectionStore.select(
                effectiveId.value,
                'message',
                messageId,
                true,
            );
        }
    }

    function setMessagesSelection(ids: string[]) {
        selectionStore.select(effectiveId.value, 'message', ids, false);
    }

    function clearMessageSelection() {
        selectionStore.clearSelection(effectiveId.value, 'message');
    }

    // Chunk 相关操作
    function handleChunkClickSelection(event: MouseEvent, chunkId: string) {
        const allChunks = logStore.documents.flatMap((doc) => doc.chunks);

        selectionStore.handleEventSelection(
            effectiveId.value,
            'chunk',
            event,
            chunkId,
            allChunks,
            (c) => c.chunkId,
        );
    }

    function toggleChunkSelection(chunkId: string) {
        const current = selectedChunkIds.value;
        if (current.has(chunkId)) {
            selectionStore.deselect(effectiveId.value, 'chunk', chunkId);
        } else {
            selectionStore.select(effectiveId.value, 'chunk', chunkId, true);
        }
    }

    function setChunkSelection(chunkIds: string[]) {
        selectionStore.select(effectiveId.value, 'chunk', chunkIds, false);
    }

    function selectAllChunks() {
        const allIds = logStore.documents.flatMap((doc) =>
            doc.chunks.map((c) => c.chunkId),
        );
        selectionStore.select(effectiveId.value, 'chunk', allIds, false);
    }

    function clearChunkSelection() {
        selectionStore.clearSelection(effectiveId.value, 'chunk');
    }

    function selectAllInChunk(chunkId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (chunk) {
            const ids = chunk.messages.map((m) => m.messageId);
            selectionStore.select(effectiveId.value, 'message', ids, false);
        }
    }

    function selectMessagesByFilter(filter: MessageFilter) {
        const matchedIds: string[] = [];
        logStore.documents.forEach((doc) => {
            doc.chunks.forEach((chunk) => {
                chunk.messages.forEach((msg) => {
                    if (matchesMessageFilter(msg, filter))
                        matchedIds.push(msg.messageId);
                });
            });
        });
        selectionStore.select(effectiveId.value, 'message', matchedIds, true);
    }

    return {
        effectiveId,
        selectedMessageIds,
        selectedChunkIds,
        lastSelectedMessageId,
        hasSelection,
        selectedMessagesCount,
        selectedMessages,

        handleMessageClickSelection,
        toggleMessageSelection,
        setMessagesSelection,
        clearMessageSelection,

        handleChunkClickSelection,
        toggleChunkSelection,
        setChunkSelection,
        selectAllChunks,
        clearChunkSelection,

        selectAllInChunk,
        selectMessagesByFilter,
        clearSelection: () => selectionStore.clearSelection(effectiveId.value),
    };
}
