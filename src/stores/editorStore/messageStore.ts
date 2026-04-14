import { defineStore } from 'pinia';
import { useLogStore } from '@/stores/logStore';
import { useHistoryStore } from '@/stores/historyStore';
import type { Message, Chunk } from '@/types/log';

export const useMessageEditorStore = defineStore('messageEditor', () => {
    const logStore = useLogStore();
    const historyStore = useHistoryStore();

    // 刷新分块内所有消息的 chunkId
    function refreshMessageMetadata(chunk: Chunk) {
        chunk.messages.forEach((m, i) => {
            m.messageIndex = i;
            m.chunkId = chunk.chunkId;
        });
    }

    function hasMessageUpdates(message: Message, updates: Partial<Message>) {
        const keys = Object.keys(updates) as Array<keyof Message>;
        return keys.some((key) => !Object.is(message[key], updates[key]));
    }

    // 基础CRUD
    function addMessage(
        chunkId: string,
        message: Message,
        insertIndex: number,
    ) {
        insertMessages(chunkId, [message], insertIndex);
    }

    function insertMessages(
        chunkId: string,
        messages: Message[],
        insertIndex: number,
    ) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk || messages.length === 0) return;

        historyStore.captureSnapshot();
        const clampedIndex = Math.max(
            0,
            Math.min(insertIndex, chunk.messages.length),
        );
        chunk.messages.splice(clampedIndex, 0, ...messages);
        refreshMessageMetadata(chunk);
    }

    function deleteMessage(chunkId: string, messageId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const index = chunk.messages.findIndex(
            (m) => m.messageId === messageId,
        );
        if (index !== -1) {
            historyStore.captureSnapshot();
            chunk.messages.splice(index, 1);
            refreshMessageMetadata(chunk);
        }
    }

    function updateMessage(
        chunkId: string,
        messageId: string,
        updates: Partial<Message>,
    ) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const message = chunk.messages.find((m) => m.messageId === messageId);
        if (!message || !hasMessageUpdates(message, updates)) return;

        historyStore.captureSnapshot();
        Object.assign(message, updates);
    }

    // 批量移动
    function moveMessages(
        messageIds: string[],
        sourceChunkId: string,
        targetChunkId: string,
        targetIndex: number,
    ) {
        if (messageIds.length === 0) return;

        const sourceChunk = logStore.findChunkById(sourceChunkId);
        const targetChunk = logStore.findChunkById(targetChunkId);
        if (!sourceChunk || !targetChunk) return;

        const idSet = new Set(messageIds);
        const movingMessages = sourceChunk.messages.filter((m) =>
            idSet.has(m.messageId),
        );
        if (movingMessages.length === 0) return;

        historyStore.captureSnapshot();

        sourceChunk.messages = sourceChunk.messages.filter(
            (m) => !idSet.has(m.messageId),
        );
        const clampedIndex = Math.max(
            0,
            Math.min(targetIndex, targetChunk.messages.length),
        );
        targetChunk.messages.splice(clampedIndex, 0, ...movingMessages);
        refreshMessageMetadata(sourceChunk);
        if (sourceChunkId !== targetChunkId) {
            refreshMessageMetadata(targetChunk);
        }
    }
    // 块内排序
    function reorderMessageInChunk(
        chunkId: string,
        oldIndex: number,
        newIndex: number,
    ) {
        const chunk = logStore.findChunkById(chunkId);
        if (
            !chunk ||
            oldIndex === newIndex ||
            oldIndex < 0 ||
            oldIndex >= chunk.messages.length ||
            newIndex < 0 ||
            newIndex >= chunk.messages.length
        )
            return;

        historyStore.captureSnapshot();
        const [message] = chunk.messages.splice(oldIndex, 1);
        if (message) {
            chunk.messages.splice(newIndex, 0, message);
            refreshMessageMetadata(chunk);
        }
    }

    // 批量删除
    function batchDeleteMessages(targetIds: Set<string>) {
        if (targetIds.size === 0) return;

        let hasChange = false;
        for (const doc of logStore.documents) {
            for (const chunk of doc.chunks) {
                if (chunk.messages.some((m) => targetIds.has(m.messageId))) {
                    hasChange = true;
                    break;
                }
            }
            if (hasChange) break;
        }

        if (!hasChange) return;

        historyStore.captureSnapshot();
        logStore.documents.forEach((doc) => {
            doc.chunks.forEach((chunk) => {
                const originalLength = chunk.messages.length;
                chunk.messages = chunk.messages.filter(
                    (m) => !targetIds.has(m.messageId),
                );

                if (chunk.messages.length !== originalLength) {
                    refreshMessageMetadata(chunk);
                }
            });
        });
    }

    // 批量更新
    function batchUpdateMessages(
        targetIds: Set<string>,
        updates: Partial<Message>,
    ) {
        if (targetIds.size === 0) return;

        let hasChange = false;
        for (const doc of logStore.documents) {
            for (const chunk of doc.chunks) {
                for (const message of chunk.messages) {
                    if (
                        targetIds.has(message.messageId) &&
                        hasMessageUpdates(message, updates)
                    ) {
                        hasChange = true;
                        break;
                    }
                }
                if (hasChange) break;
            }
            if (hasChange) break;
        }

        if (!hasChange) return;

        historyStore.captureSnapshot();
        logStore.documents.forEach((doc) => {
            doc.chunks.forEach((chunk) => {
                chunk.messages.forEach((m) => {
                    if (targetIds.has(m.messageId)) {
                        Object.assign(m, updates);
                    }
                });
            });
        });
    }

    // 合并
    function mergeMessages(
        chunkId: string,
        messageIds: string[],
        targetMessageId?: string,
    ) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk || messageIds.length < 2) return;

        const toMerge = chunk.messages
            .filter((m) => messageIds.includes(m.messageId))
            .sort((a, b) => a.messageIndex - b.messageIndex);
        if (toMerge.length < 2) return;

        const target =
            toMerge.find((m) => m.messageId === targetMessageId) || toMerge[0];
        const mergedContent = toMerge.map((m) => m.content).join('\n');

        const removeIds = new Set(
            messageIds.filter((id) => id !== target.messageId),
        );
        if (target.content === mergedContent && removeIds.size === 0) return;

        historyStore.captureSnapshot();

        target.content = mergedContent;
        chunk.messages = chunk.messages.filter(
            (m) => !removeIds.has(m.messageId),
        );

        refreshMessageMetadata(chunk);
    }

    // 批量切换场外
    function toggleOoc(targetIds: Set<string>) {
        if (targetIds.size === 0) return;

        historyStore.captureSnapshot();
        for (const doc of logStore.documents) {
            for (const chunk of doc.chunks) {
                for (const msg of chunk.messages) {
                    if (targetIds.has(msg.messageId)) {
                        msg.isOoc = !msg.isOoc;
                    }
                }
            }
        }
    }

    // 批量切换 Command 状态
    function toggleCommand(targetIds: Set<string>) {
        if (targetIds.size === 0) return;

        historyStore.captureSnapshot();
        for (const doc of logStore.documents) {
            for (const chunk of doc.chunks) {
                for (const msg of chunk.messages) {
                    if (targetIds.has(msg.messageId)) {
                        msg.isCommand = !msg.isCommand;
                    }
                }
            }
        }
    }

    return {
        addMessage,
        insertMessages,
        deleteMessage,
        updateMessage,
        moveMessages,
        reorderMessageInChunk,
        batchDeleteMessages,
        batchUpdateMessages,
        mergeMessages,
        toggleOoc,
        toggleCommand,
    };
});
