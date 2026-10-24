import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { Message } from '@/types/log';
import { useLogStore } from '@/stores/project/logStore';
import type { SelectionScope } from '@/types/selection';
import { useSelectionStore } from '@/stores/editor/selectionStore';

export function useSelectionContext(
    ownerScope?: MaybeRefOrGetter<SelectionScope | undefined>,
) {
    const logStore = useLogStore();
    const selectionStore = useSelectionStore();

    const effectiveScope = computed(
        () =>
            (ownerScope ? toValue(ownerScope) : undefined) ??
            selectionStore.activeScope,
    );
    const selectedMessageIds = computed(() =>
        selectionStore.getSelectedIds(effectiveScope.value, 'message'),
    );

    const selectedChunkIds = computed(() =>
        selectionStore.getSelectedIds(effectiveScope.value, 'chunk'),
    );

    const lastSelectedMessageId = computed(
        () =>
            selectionStore.getState(effectiveScope.value, 'message')
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

        const result: Message[] = [];
        ids.forEach((messageId) => {
            const message = logStore.messagesById.get(messageId);
            if (message) {
                result.push(message);
            }
        });

        if (result.length <= 1) {
            return result;
        }

        result.sort(
            (a, b) =>
                (logStore.messageOrderById.get(a.messageId) ?? 0) -
                (logStore.messageOrderById.get(b.messageId) ?? 0),
        );
        return result;
    });

    // 处理消息点击（集成 Sft/Cmd）
    function handleMessageClickSelection(
        event: MouseEvent,
        messageId: string,
        messages: Message[],
    ) {
        selectionStore.handleEventSelection(
            effectiveScope.value,
            'message',
            event,
            messageId,
            messages,
            (m) => m.messageId,
        );
    }

    function setMessagesSelection(ids: string[]) {
        selectionStore.select(effectiveScope.value, 'message', ids, false);
    }

    function clearMessageSelection() {
        selectionStore.clearSelection(effectiveScope.value, 'message');
    }

    // Chunk 相关操作
    function handleChunkClickSelection(event: MouseEvent, chunkId: string) {
        const allChunks = logStore.documents.flatMap((doc) => doc.chunks);

        selectionStore.handleEventSelection(
            effectiveScope.value,
            'chunk',
            event,
            chunkId,
            allChunks,
            (c) => c.chunkId,
        );
    }

    function setChunkSelection(chunkIds: string[]) {
        selectionStore.select(effectiveScope.value, 'chunk', chunkIds, false);
    }

    function selectAllChunks() {
        const allIds = logStore.documents.flatMap((doc) =>
            doc.chunks.map((c) => c.chunkId),
        );
        selectionStore.select(effectiveScope.value, 'chunk', allIds, false);
    }

    function clearChunkSelection() {
        selectionStore.clearSelection(effectiveScope.value, 'chunk');
    }

    function selectAllInChunk(chunkId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (chunk) {
            const ids = chunk.messages.map((m) => m.messageId);
            selectionStore.select(effectiveScope.value, 'message', ids, false);
        }
    }

    return {
        effectiveScope,
        selectedMessageIds,
        selectedChunkIds,
        lastSelectedMessageId,
        hasSelection,
        selectedMessagesCount,
        selectedMessages,

        handleMessageClickSelection,
        setMessagesSelection,
        clearMessageSelection,

        handleChunkClickSelection,
        setChunkSelection,
        selectAllChunks,
        clearChunkSelection,

        selectAllInChunk,
        clearSelection: () =>
            selectionStore.clearSelection(effectiveScope.value),
    };
}
