import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Message, Chunk } from '@/types/log';
import { generateId } from '@/utils/id';

export const useClipboardStore = defineStore('clipboard', () => {
    const dataType = ref<'messages' | 'chunks' | null>(null);
    const copiedMessages = ref<Message[]>([]);
    const copiedChunks = ref<Chunk[]>([]);

    //深拷贝，防止修改原始引用
    function copyMessages(messages: Message[]) {
        dataType.value = 'messages';
        copiedMessages.value = messages.map((m) => ({
            ...m,
            time: new Date(m.time.getTime()),
            messageIndex: -1,
            chunkId: 'null', // 复制时不保留 index,chunkId，由messageStore.addMessage调用的时候补上
        }));
        copiedChunks.value = [];
    }

    // 深度拷贝分块及其内部的所有消息
    function copyChunks(chunks: Chunk[]) {
        dataType.value = 'chunks';
        copiedChunks.value = chunks.map((c) => ({
            ...c,
            messages: c.messages.map((m) => ({
                ...m,
                time: new Date(m.time.getTime()),
            })),
        }));
        copiedMessages.value = [];
    }

    // 获取粘贴的消息（重新生成 ID）
    function getPasteMessages(): Message[] {
        if (dataType.value !== 'messages') return [];
        return copiedMessages.value.map((m) => ({
            ...m,
            messageId: generateId(),
        }));
    }

    // 获取粘贴的分块（为分块及其内部消息重新生成 ID）
    function getPasteChunks(): Chunk[] {
        if (dataType.value !== 'chunks') return [];
        return copiedChunks.value.map((c) => {
            const newChunkId = generateId();
            return {
                ...c,
                chunkId: newChunkId,
                // docId 和 chunkIndex 将在插入时由 refreshChunkMetadata 覆盖
                messages: c.messages.map((m) => ({
                    ...m,
                    messageId: generateId(),
                    chunkId: newChunkId,
                    time: new Date(m.time.getTime()),
                })),
            };
        });
    }

    function hasData() {
        return copiedMessages.value.length > 0 || copiedChunks.value.length > 0;
    }

    function clearClipboard() {
        dataType.value = null;
        copiedMessages.value = [];
        copiedChunks.value = [];
    }

    return {
        dataType,
        copiedMessages,
        copiedChunks,
        copyMessages,
        copyChunks,
        getPasteMessages,
        getPasteChunks,
        hasData,
        clearClipboard,
    };
});
