import { reactive, computed } from 'vue';
import type { Message, MessageFilter } from '@/types/log';
import { matchesMessageFilter } from '@/editor/filter';
import { useLogStore } from '@/stores/logStore';
import { useWindowStore } from '@/stores/windowStore';

// 全局隔离的选区状态 key: windowId
const messageSelections = reactive(new Map<string, Set<string>>());
const chunkSelections = reactive(new Map<string, Set<string>>());
const lastSelectedMessages = reactive(new Map<string, string | null>());

export function useFilter(ownerId?: string) {
    const logStore = useLogStore();
    const windowStore = useWindowStore();
    const effectiveId = computed(() => {
        // 如果组件显式声明了 ownerId，直接使用
        if (ownerId) return ownerId;
        // 否则，根据焦点栈向下回溯
        const stack = windowStore.focusStack;
        for (let i = stack.length - 1; i >= 0; i--) {
            const target = stack[i];
            if (
                target !== 'help' &&
                target !== 'inspector' &&
                target !== 'exportFormat'
            ) {
                return target;
            }
        }
        return 'defaultView';
    });

    // 暴露当前有效域的响应式集合
    const selectedMessageIds = computed(() => {
        return messageSelections.get(effectiveId.value) || new Set<string>();
    });

    const selectedChunkIds = computed(() => {
        return chunkSelections.get(effectiveId.value) || new Set<string>();
    });

    const lastSelectedMessageId = computed({
        get: () => lastSelectedMessages.get(effectiveId.value) || null,
        set: (val) => lastSelectedMessages.set(effectiveId.value, val),
    });

    // 选区操作方法 (基于不可变数据模式触发更新)
    function toggleMessageSelection(messageId: string) {
        const id = effectiveId.value;
        const currentSet = messageSelections.get(id) || new Set<string>();
        // 克隆 Set，确保 Vue 的 computed 能完美捕捉到依赖变化
        const newSet = new Set(currentSet);

        if (newSet.has(messageId)) {
            newSet.delete(messageId);
        } else {
            newSet.add(messageId);
        }

        messageSelections.set(id, newSet);
        lastSelectedMessages.set(id, messageId);
    }

    function addMessageSelection(messageId: string) {
        const id = effectiveId.value;
        const currentSet = messageSelections.get(id) || new Set<string>();
        if (!currentSet.has(messageId)) {
            const newSet = new Set(currentSet);
            newSet.add(messageId);
            messageSelections.set(id, newSet);
        }
    }

    function toggleChunkSelection(chunkId: string) {
        const id = effectiveId.value;
        const currentSet = chunkSelections.get(id) || new Set<string>();
        const newSet = new Set(currentSet);

        if (newSet.has(chunkId)) {
            newSet.delete(chunkId);
        } else {
            newSet.add(chunkId);
        }

        chunkSelections.set(id, newSet);
    }

    function setChunkSelection(chunkIds: string[]) {
        chunkSelections.set(effectiveId.value, new Set(chunkIds));
    }

    function selectAllChunks(targetDocId?: string) {
        const id = effectiveId.value;
        const targetIds: string[] = [];

        logStore.documents.forEach((doc) => {
            if (!targetDocId || doc.docId === targetDocId) {
                doc.chunks.forEach((chunk) => {
                    targetIds.push(chunk.chunkId);
                });
            }
        });
        chunkSelections.set(id, new Set(targetIds));
    }

    function clearMessageSelection() {
        messageSelections.set(effectiveId.value, new Set());
        lastSelectedMessages.set(effectiveId.value, null);
    }

    function clearChunkSelection() {
        chunkSelections.set(effectiveId.value, new Set());
    }

    function clearSelection() {
        clearMessageSelection();
        clearChunkSelection();
    }

    // 过滤器匹配 (应用于当前窗口的选区)
    function selectMessagesByFilter(filter: MessageFilter) {
        const id = effectiveId.value;
        const currentSet = messageSelections.get(id) || new Set<string>();
        const newSet = new Set(currentSet);

        const docs = logStore.documents;
        for (let i = 0; i < docs.length; i++) {
            const chunks = docs[i].chunks;
            for (let j = 0; j < chunks.length; j++) {
                const messages = chunks[j].messages;
                for (let k = 0; k < messages.length; k++) {
                    const msg = messages[k];
                    if (matchesMessageFilter(msg, filter)) {
                        newSet.add(msg.messageId);
                    }
                }
            }
        }
        messageSelections.set(id, newSet);
    }

    // 全选某个 chunk 内的消息
    function selectAllInChunk(chunkId: string) {
        const id = effectiveId.value;
        const currentSet = messageSelections.get(id) || new Set<string>();
        const newSet = new Set(currentSet);

        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const messages = chunk.messages;
        for (let i = 0; i < messages.length; i++) {
            newSet.add(messages[i].messageId);
        }
        messageSelections.set(id, newSet);
    }

    // 派生状态计算
    const hasSelection = computed(() => {
        return (
            selectedMessageIds.value.size > 0 || selectedChunkIds.value.size > 0
        );
    });

    const selectedMessagesCount = computed(() => {
        return selectedMessageIds.value.size;
    });

    const selectedMessages = computed(() => {
        const result: Message[] = [];
        const ids = selectedMessageIds.value;
        if (ids.size === 0) return result;

        const docs = logStore.documents;
        for (let k = 0; k < docs.length; k++) {
            const chunks = docs[k].chunks;
            for (let i = 0; i < chunks.length; i++) {
                const messages = chunks[i].messages;
                for (let j = 0; j < messages.length; j++) {
                    const msg = messages[j];
                    if (ids.has(msg.messageId)) {
                        result.push(msg);
                    }
                }
            }
        }
        return result;
    });

    function setMessagesSelection(ids: string[]) {
        messageSelections.set(effectiveId.value, new Set(ids));
    }

    return {
        effectiveId, // 暴露以供调试
        selectedMessageIds,
        selectedChunkIds,
        lastSelectedMessageId,

        toggleMessageSelection,
        addMessageSelection,
        toggleChunkSelection,
        setChunkSelection,
        selectAllChunks,
        clearMessageSelection,
        clearChunkSelection,
        clearSelection,
        selectMessagesByFilter,
        selectAllInChunk,
        setMessagesSelection,

        hasSelection,
        selectedMessagesCount,
        selectedMessages,
    };
}
