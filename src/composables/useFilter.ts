import { ref, computed } from 'vue';
import type { Message, MessageFilter } from '@/types/log';
import { matchesMessageFilter } from '@/editor/filter';
import { useLogStore } from '@/stores/logStore';

const messageSelectionIds = ref<Set<string>>(new Set());
const chunkSelectionIds = ref<Set<string>>(new Set());
const searchMessageSelectionIds = ref<Set<string>>(new Set());
const searchResultIds = ref<string[]>([]);
const lastSelectedMessageId = ref<string | null>(null);

export function useFilter() {
    const logStore = useLogStore();

    function toggleMessageSelection(messageId: string) {
        if (messageSelectionIds.value.has(messageId)) {
            messageSelectionIds.value.delete(messageId);
        } else {
            messageSelectionIds.value.add(messageId);
        }
        lastSelectedMessageId.value = messageId;
    }

    function addMessageSelection(messageId: string) {
        messageSelectionIds.value.add(messageId);
        lastSelectedMessageId.value = messageId;
    }

    function setMessageSelection(messageIds: Iterable<string>) {
        messageSelectionIds.value = new Set(messageIds);
        lastSelectedMessageId.value =
            Array.from(messageSelectionIds.value).at(-1) || null;
    }

    function clearMessageSelection() {
        messageSelectionIds.value.clear();
        lastSelectedMessageId.value = null;
    }

    function toggleChunkSelection(chunkId: string) {
        if (chunkSelectionIds.value.has(chunkId)) {
            chunkSelectionIds.value.delete(chunkId);
        } else {
            chunkSelectionIds.value.add(chunkId);
        }
    }

    function setChunkSelection(chunkIds: Iterable<string>) {
        chunkSelectionIds.value = new Set(chunkIds);
    }

    function setActiveChunkSelection(chunkId: string | null) {
        if (!chunkId) {
            chunkSelectionIds.value.clear();
            return;
        }
        chunkSelectionIds.value = new Set([chunkId]);
    }

    function clearChunkSelection() {
        chunkSelectionIds.value.clear();
    }

    function toggleSearchMessageSelection(messageId: string) {
        if (searchMessageSelectionIds.value.has(messageId)) {
            searchMessageSelectionIds.value.delete(messageId);
        } else {
            searchMessageSelectionIds.value.add(messageId);
        }
    }

    function addSearchMessageSelection(messageId: string) {
        searchMessageSelectionIds.value.add(messageId);
    }

    function setSearchMessageSelection(messageIds: Iterable<string>) {
        searchMessageSelectionIds.value = new Set(messageIds);
    }

    function clearSearchMessageSelection() {
        searchMessageSelectionIds.value.clear();
    }

    function setSearchResultIds(messageIds: Iterable<string>) {
        searchResultIds.value = Array.from(messageIds);
        const nextSelection = searchResultIds.value.filter((messageId) =>
            searchMessageSelectionIds.value.has(messageId),
        );
        searchMessageSelectionIds.value = new Set(nextSelection);
    }

    function selectAllSearchResults() {
        searchMessageSelectionIds.value = new Set(searchResultIds.value);
    }

    function clearAllSelections() {
        clearMessageSelection();
        clearChunkSelection();
        clearSearchMessageSelection();
    }

    function selectMessagesByFilter(filter: MessageFilter) {
        const docs = logStore.documents;
        for (let i = 0; i < docs.length; i++) {
            const chunks = docs[i].chunks;
            for (let j = 0; j < chunks.length; j++) {
                const messages = chunks[j].messages;
                for (let k = 0; k < messages.length; k++) {
                    const msg = messages[k];
                    if (matchesMessageFilter(msg, filter)) {
                        addMessageSelection(msg.messageId);
                    }
                }
            }
        }
    }

    function selectAllInChunk(chunkId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        setMessageSelection(chunk.messages.map((message) => message.messageId));
    }

    const hasSelection = computed(function () {
        return (
            messageSelectionIds.value.size > 0 ||
            chunkSelectionIds.value.size > 0 ||
            searchMessageSelectionIds.value.size > 0
        );
    });

    const messageSelectionCount = computed(function () {
        return messageSelectionIds.value.size;
    });

    const chunkSelectionCount = computed(function () {
        return chunkSelectionIds.value.size;
    });

    const searchMessageSelectionCount = computed(function () {
        return searchMessageSelectionIds.value.size;
    });

    const selectedChunks = computed(function () {
        return logStore.allChunks.filter((chunk) =>
            chunkSelectionIds.value.has(chunk.chunkId),
        );
    });

    const selectedMessages = computed(function () {
        const result: Message[] = [];
        const docs = logStore.documents;

        for (let k = 0; k < docs.length; k++) {
            const chunks = docs[k].chunks;
            for (let i = 0; i < chunks.length; i++) {
                const messages = chunks[i].messages;
                for (let j = 0; j < messages.length; j++) {
                    const msg = messages[j];
                    if (messageSelectionIds.value.has(msg.messageId)) {
                        result.push(msg);
                    }
                }
            }
        }

        return result;
    });

    const selectedSearchMessages = computed(function () {
        const result: Message[] = [];
        const docs = logStore.documents;

        for (let k = 0; k < docs.length; k++) {
            const chunks = docs[k].chunks;
            for (let i = 0; i < chunks.length; i++) {
                const messages = chunks[i].messages;
                for (let j = 0; j < messages.length; j++) {
                    const msg = messages[j];
                    if (searchMessageSelectionIds.value.has(msg.messageId)) {
                        result.push(msg);
                    }
                }
            }
        }

        return result;
    });

    return {
        messageSelectionIds,
        chunkSelectionIds,
        searchMessageSelectionIds,
        searchResultIds,
        lastSelectedMessageId,

        toggleMessageSelection,
        addMessageSelection,
        setMessageSelection,
        clearMessageSelection,

        toggleChunkSelection,
        setChunkSelection,
        setActiveChunkSelection,
        clearChunkSelection,

        toggleSearchMessageSelection,
        addSearchMessageSelection,
        setSearchMessageSelection,
        clearSearchMessageSelection,
        setSearchResultIds,
        selectAllSearchResults,

        clearAllSelections,
        selectMessagesByFilter,
        selectAllInChunk,

        hasSelection,
        messageSelectionCount,
        chunkSelectionCount,
        searchMessageSelectionCount,
        selectedMessages,
        selectedChunks,
        selectedSearchMessages,
    };
}
