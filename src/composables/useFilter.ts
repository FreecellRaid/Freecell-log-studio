import { ref, computed } from 'vue';
import type { Message, MessageFilter } from '@/types/log';
import { matchesMessageFilter } from '@/editor/filter';
import { useLogStore } from '@/stores/logStore';

const selectedMessageIds = ref<Set<string>>(new Set());
const selectedChunkIds = ref<Set<string>>(new Set());
const lastSelectedMessageId = ref<string | null>(null);

export function useFilter() {
    const logStore = useLogStore();

    function toggleMessageSelection(messageId: string) {
        if (selectedMessageIds.value.has(messageId)) {
            selectedMessageIds.value.delete(messageId);
        } else {
            selectedMessageIds.value.add(messageId);
        }
        lastSelectedMessageId.value = messageId;
    }

    function toggleChunkSelection(chunkId: string) {
        if (selectedChunkIds.value.has(chunkId)) {
            selectedChunkIds.value.delete(chunkId);
        } else {
            selectedChunkIds.value.add(chunkId);
        }
    }

    function clearSelection() {
        selectedMessageIds.value.clear();
        selectedChunkIds.value.clear();
        lastSelectedMessageId.value = null;
    }

    // 过滤器匹配
    function selectMessagesByFilter(filter: MessageFilter) {
        const docs = logStore.documents;
        for (let i = 0; i < docs.length; i++) {
            const chunks = docs[i].chunks;
            for (let j = 0; j < chunks.length; j++) {
                const messages = chunks[j].messages;
                for (let k = 0; k < messages.length; k++) {
                    const msg = messages[k];
                    if (matchesMessageFilter(msg, filter)) {
                        selectedMessageIds.value.add(msg.messageId);
                    }
                }
            }
        }
    }

    // 全选chunk
    function selectAllInChunk(chunkId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const messages = chunk.messages;
        for (let i = 0; i < messages.length; i++) {
            selectedMessageIds.value.add(messages[i].messageId);
        }
    }

    const hasSelection = computed(function () {
        return (
            selectedMessageIds.value.size > 0 || selectedChunkIds.value.size > 0
        );
    });

    const selectedMessagesCount = computed(function () {
        return selectedMessageIds.value.size;
    });

    // 获取当前所有被选中的消息对象列表 (用于批量编辑)
    const selectedMessages = computed(function () {
        const result: Message[] = [];
        const docs = logStore.documents;

        for (let k = 0; k < docs.length; k++) {
            const chunks = docs[k].chunks;
            for (let i = 0; i < chunks.length; i++) {
                const messages = chunks[i].messages;
                for (let j = 0; j < messages.length; j++) {
                    const msg = messages[j];
                    if (selectedMessageIds.value.has(msg.messageId)) {
                        result.push(msg);
                    }
                }
            }
        }
        return result;
    });

    return {
        selectedMessageIds,
        selectedChunkIds,
        lastSelectedMessageId,

        toggleMessageSelection,
        toggleChunkSelection,
        clearSelection,
        selectMessagesByFilter,
        selectAllInChunk,

        hasSelection,
        selectedMessagesCount,
        selectedMessages,
    };
}
