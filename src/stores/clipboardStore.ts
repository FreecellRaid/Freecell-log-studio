import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Message } from '@/types/log';
import { generateId } from "@/utils/id";

export const useClipboardStore = defineStore('clipboard', () => {
    const copiedMessages = ref<Message[]>([]);

    //深拷贝，防止修改原始引用
    function copy(messages: Message[]) {
        copiedMessages.value = messages.map((m) => ({
            ...m,
            time: new Date(m.time.getTime()),
            // 复制时不保留 index,chunkId，由messageStore.addMessage调用的时候补上
            messageIndex: -1,
            chunkId: 'null',
        }));
    }

    function getPasteData(): Message[] {
        return copiedMessages.value.map((m) => ({
            ...m,
            messageId: generateId(),
            time: new Date(m.time.getTime()),
        }));
    }

    function hasData() {
        return copiedMessages.value.length > 0;
    }

    function clearClipboard() {
        copiedMessages.value = [];
    }

    return {
        copiedMessages,
        copy,
        getPasteData,
        hasData,
        clearClipboard,
    };
});
