import { readonly, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { generateId } from '@/utils/id';

export const useMessageRevealStore = defineStore('messageReveal', () => {
    const pending = shallowRef<{
        requestId: string;
        paneId: string;
        chunkId: string;
        messageId: string;
    } | null>(null);
    function request(paneId: string, chunkId: string, messageId: string) {
        pending.value = { requestId: generateId(), paneId, chunkId, messageId };
    }
    function clear(requestId?: string) {
        if (!requestId || pending.value?.requestId === requestId)
            pending.value = null;
    }
    return { pending: readonly(pending), request, clear };
});
