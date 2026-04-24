import { defineStore } from 'pinia';
import { useLogStore } from '@/stores/logStore';
import { useHistoryStore } from '@/stores/historyStore';
import { generateId } from '@/utils/id';
import type { Chunk, Message } from '@/types/log';

function hasKeys<T extends object>(value: Partial<T>) {
    return Object.keys(value).length > 0;
}

export const useLogEditorStore = defineStore('logEditor', () => {
    const logStore = useLogStore();
    const historyStore = useHistoryStore();

    function runEdit(
        hasChange: boolean | (() => boolean),
        mutate: () => void,
        options?: {
            normalize?: () => void;
            syncProjectName?: boolean;
        },
    ) {
        const shouldRun =
            typeof hasChange === 'function' ? hasChange() : hasChange;
        if (!shouldRun) {
            return false;
        }

        historyStore.captureSnapshot();
        mutate();
        options?.normalize?.();
        if (options?.syncProjectName) {
            logStore.syncProjectNameFromDocuments();
        }

        return true;
    }

    function sanitizeChunkUpdates(updates: Partial<Chunk>) {
        const { chunkId, docId, chunkIndex, messages, ...safeUpdates } = updates;
        void chunkId;
        void docId;
        void chunkIndex;
        void messages;
        return safeUpdates;
    }

    function sanitizeMessageUpdates(updates: Partial<Message>) {
        const { messageId, chunkId, messageIndex, ...safeUpdates } = updates;
        void messageId;
        void chunkId;
        void messageIndex;
        return safeUpdates;
    }

    function hasEntityUpdates<T extends object>(
        entity: T,
        updates: Partial<T>,
    ) {
        const keys = Object.keys(updates) as Array<keyof T>;
        return keys.some((key) => !Object.is(entity[key], updates[key]));
    }

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

        runEdit(
            true,
            () => {
                const clampedIndex = Math.max(
                    0,
                    Math.min(insertIndex, chunk.messages.length),
                );
                chunk.messages.splice(clampedIndex, 0, ...messages);
            },
            {
                normalize: () => logStore.normalizeMessages(chunk),
            },
        );
    }

    function insertNewMessageAfter(
        chunkId: string,
        msg: Message,
        index: number,
    ) {
        const newMessage: Message = {
            messageId: generateId(),
            chunkId,
            messageIndex: index + 1,
            playerName: msg.playerName,
            account: msg.account,
            time: new Date(),
            content: '',
            isOoc: false,
            isCommand: false,
            role: msg.role,
            note: '',
        };

        insertMessages(chunkId, [newMessage], index + 1);
    }

    function deleteMessage(chunkId: string, messageId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const index = chunk.messages.findIndex((m) => m.messageId === messageId);
        runEdit(
            index !== -1,
            () => {
                chunk.messages.splice(index, 1);
            },
            {
                normalize: () => logStore.normalizeMessages(chunk),
            },
        );
    }

    function updateMessage(
        chunkId: string,
        messageId: string,
        updates: Partial<Message>,
    ) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const message = chunk.messages.find((m) => m.messageId === messageId);
        if (!message) return;

        const safeUpdates = sanitizeMessageUpdates(updates);
        runEdit(
            hasKeys(safeUpdates) && hasEntityUpdates(message, safeUpdates),
            () => {
                Object.assign(message, safeUpdates);
            },
            {
                normalize: () => logStore.normalizeMessages(chunk),
            },
        );
    }

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

        const sourcePositions = sourceChunk.messages
            .map((message, index) =>
                idSet.has(message.messageId) ? index : -1,
            )
            .filter((index) => index !== -1);
        const currentStartIndex = sourcePositions[0] ?? -1;
        const currentEndIndex = sourcePositions[sourcePositions.length - 1] ?? -1;
        const normalizedTargetIndex = Math.max(
            0,
            Math.min(targetIndex, targetChunk.messages.length),
        );
        const isNoopMove =
            sourceChunkId === targetChunkId &&
            currentStartIndex !== -1 &&
            normalizedTargetIndex >= currentStartIndex &&
            normalizedTargetIndex <= currentEndIndex + 1;

        runEdit(
            !isNoopMove,
            () => {
                sourceChunk.messages = sourceChunk.messages.filter(
                    (m) => !idSet.has(m.messageId),
                );
                const clampedIndex = Math.max(
                    0,
                    Math.min(targetIndex, targetChunk.messages.length),
                );
                targetChunk.messages.splice(clampedIndex, 0, ...movingMessages);
            },
            {
                normalize: () => {
                    logStore.normalizeMessages(sourceChunk);
                    if (sourceChunkId !== targetChunkId) {
                        logStore.normalizeMessages(targetChunk);
                    }
                },
            },
        );
    }

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
        ) {
            return;
        }

        runEdit(
            true,
            () => {
                const [message] = chunk.messages.splice(oldIndex, 1);
                if (message) {
                    chunk.messages.splice(newIndex, 0, message);
                }
            },
            {
                normalize: () => logStore.normalizeMessages(chunk),
            },
        );
    }

    function batchDeleteMessages(targetIds: Set<string>) {
        if (targetIds.size === 0) return;

        runEdit(
            () =>
                logStore.documents.some((doc) =>
                    doc.chunks.some((chunk) =>
                        chunk.messages.some((m) => targetIds.has(m.messageId)),
                    ),
                ),
            () => {
                logStore.documents.forEach((doc) => {
                    doc.chunks.forEach((chunk) => {
                        chunk.messages = chunk.messages.filter(
                            (m) => !targetIds.has(m.messageId),
                        );
                    });
                });
            },
            {
                normalize: () => logStore.normalizeDocuments(logStore.documents),
            },
        );
    }

    function batchUpdateMessages(
        targetIds: Set<string>,
        updates: Partial<Message>,
    ) {
        if (targetIds.size === 0) return;

        const safeUpdates = sanitizeMessageUpdates(updates);
        if (!hasKeys(safeUpdates)) return;

        runEdit(
            () =>
                logStore.documents.some((doc) =>
                    doc.chunks.some((chunk) =>
                        chunk.messages.some(
                            (message) =>
                                targetIds.has(message.messageId) &&
                                hasEntityUpdates(message, safeUpdates),
                        ),
                    ),
                ),
            () => {
                logStore.documents.forEach((doc) => {
                    doc.chunks.forEach((chunk) => {
                        chunk.messages.forEach((message) => {
                            if (targetIds.has(message.messageId)) {
                                Object.assign(message, safeUpdates);
                            }
                        });
                    });
                });
            },
            {
                normalize: () => logStore.normalizeDocuments(logStore.documents),
            },
        );
    }

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
            toMerge
                .map((message) => message.messageId)
                .filter((id) => id !== target.messageId),
        );

        runEdit(
            target.content !== mergedContent || removeIds.size > 0,
            () => {
                target.content = mergedContent;
                chunk.messages = chunk.messages.filter(
                    (m) => !removeIds.has(m.messageId),
                );
            },
            {
                normalize: () => logStore.normalizeMessages(chunk),
            },
        );
    }

    function mergeWithNextMessage(chunkId: string, messageId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const index = chunk.messages.findIndex((m) => m.messageId === messageId);
        if (index === -1 || index >= chunk.messages.length - 1) return;

        const nextMessage = chunk.messages[index + 1];
        mergeMessages(chunkId, [messageId, nextMessage.messageId], messageId);
    }

    function toggleOoc(targetIds: Set<string>) {
        if (targetIds.size === 0) return;

        runEdit(
            () =>
                logStore.documents.some((doc) =>
                    doc.chunks.some((chunk) =>
                        chunk.messages.some((m) => targetIds.has(m.messageId)),
                    ),
                ),
            () => {
                logStore.documents.forEach((doc) => {
                    doc.chunks.forEach((chunk) => {
                        chunk.messages.forEach((msg) => {
                            if (targetIds.has(msg.messageId)) {
                                msg.isOoc = !msg.isOoc;
                            }
                        });
                    });
                });
            },
            {
                normalize: () => logStore.normalizeDocuments(logStore.documents),
            },
        );
    }

    function toggleCommand(targetIds: Set<string>) {
        if (targetIds.size === 0) return;

        runEdit(
            () =>
                logStore.documents.some((doc) =>
                    doc.chunks.some((chunk) =>
                        chunk.messages.some((m) => targetIds.has(m.messageId)),
                    ),
                ),
            () => {
                logStore.documents.forEach((doc) => {
                    doc.chunks.forEach((chunk) => {
                        chunk.messages.forEach((msg) => {
                            if (targetIds.has(msg.messageId)) {
                                msg.isCommand = !msg.isCommand;
                            }
                        });
                    });
                });
            },
            {
                normalize: () => logStore.normalizeDocuments(logStore.documents),
            },
        );
    }

    function updateChunk(chunkId: string, updates: Partial<Chunk>) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const safeUpdates = sanitizeChunkUpdates(updates);
        const doc = logStore.findDocumentById(chunk.docId);
        if (!doc) return;

        runEdit(
            hasKeys(safeUpdates) && hasEntityUpdates(chunk, safeUpdates),
            () => {
                Object.assign(chunk, safeUpdates);
            },
            {
                normalize: () => logStore.normalizeDocument(doc),
            },
        );
    }

    function renameDocument(docId: string, docName: string) {
        const doc = logStore.findDocumentById(docId);
        if (!doc) return;

        const normalizedName = docName.trim();
        runEdit(
            normalizedName.length > 0 && normalizedName !== doc.docName,
            () => {
                doc.docName = normalizedName;
            },
            {
                normalize: () => logStore.normalizeDocument(doc),
                syncProjectName: true,
            },
        );
    }

    function deleteChunk(chunkId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const doc = logStore.findDocumentById(chunk.docId);
        if (!doc) return;

        runEdit(
            doc.chunks.some((c) => c.chunkId === chunkId),
            () => {
                doc.chunks = doc.chunks.filter((c) => c.chunkId !== chunkId);
            },
            {
                normalize: () => logStore.normalizeDocument(doc),
            },
        );
    }

    function moveChunk(
        chunkId: string,
        targetDocId: string,
        targetIndex: number,
    ) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const sourceDoc = logStore.findDocumentById(chunk.docId);
        const targetDoc = logStore.findDocumentById(targetDocId);
        if (!sourceDoc || !targetDoc) return;

        const sourceIndex = sourceDoc.chunks.findIndex((c) => c.chunkId === chunkId);
        if (sourceIndex === -1) return;

        const normalizedTargetIndex = Math.max(
            0,
            Math.min(targetIndex, targetDoc.chunks.length),
        );
        const isNoopMove =
            sourceDoc.docId === targetDoc.docId &&
            normalizedTargetIndex >= sourceIndex &&
            normalizedTargetIndex <= sourceIndex + 1;

        runEdit(
            !isNoopMove,
            () => {
                sourceDoc.chunks.splice(sourceIndex, 1);
                const clampedIndex = Math.max(
                    0,
                    Math.min(targetIndex, targetDoc.chunks.length),
                );
                targetDoc.chunks.splice(clampedIndex, 0, chunk);
            },
            {
                normalize: () => {
                    logStore.normalizeDocument(sourceDoc);
                    if (sourceDoc.docId !== targetDoc.docId) {
                        logStore.normalizeDocument(targetDoc);
                    }
                },
            },
        );
    }

    function reorderChunk(oldIndex: number, newIndex: number) {
        const chunks = logStore.allChunks;
        if (
            oldIndex < 0 ||
            oldIndex >= chunks.length ||
            newIndex < 0 ||
            newIndex >= chunks.length
        ) {
            return;
        }

        const sourceChunk = chunks[oldIndex];
        const targetChunk = chunks[newIndex];
        if (!sourceChunk || !targetChunk) return;

        moveChunk(sourceChunk.chunkId, targetChunk.docId, targetChunk.chunkIndex);
    }

    function mergeChunks(chunkIds: string[]) {
        if (chunkIds.length < 2) return;

        const chunks = chunkIds
            .map((id) => logStore.findChunkById(id))
            .filter((chunk): chunk is Chunk => !!chunk)
            .sort((a, b) => a.chunkIndex - b.chunkIndex);
        if (chunks.length < 2) return;
        if (chunks.some((chunk) => chunk.docId !== chunks[0].docId)) return;

        const targetChunk = chunks[0];
        const doc = logStore.findDocumentById(targetChunk.docId);
        if (!doc) return;

        const otherIds = new Set(chunks.slice(1).map((chunk) => chunk.chunkId));
        runEdit(
            otherIds.size > 0,
            () => {
                targetChunk.messages = chunks.flatMap((chunk) => chunk.messages);
                targetChunk.chunkName = targetChunk.chunkName || '合并后的分块';
                doc.chunks = doc.chunks.filter((chunk) => !otherIds.has(chunk.chunkId));
            },
            {
                normalize: () => logStore.normalizeDocument(doc),
            },
        );
    }

    function mergeWithNextChunk(chunkId: string) {
        const currentChunk = logStore.findChunkById(chunkId);
        if (!currentChunk) return;

        const doc = logStore.findDocumentById(currentChunk.docId);
        if (!doc) return;

        const chunkIndex = doc.chunks.findIndex((chunk) => chunk.chunkId === chunkId);
        if (chunkIndex === -1 || chunkIndex >= doc.chunks.length - 1) return;

        const nextChunk = doc.chunks[chunkIndex + 1];
        runEdit(
            true,
            () => {
                currentChunk.messages.push(...nextChunk.messages);
                doc.chunks.splice(chunkIndex + 1, 1);
            },
            {
                normalize: () => logStore.normalizeDocument(doc),
            },
        );
    }

    function splitChunk(chunkId: string, messageId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const doc = logStore.findDocumentById(chunk.docId);
        if (!doc) return;

        const msgIndex = chunk.messages.findIndex((m) => m.messageId === messageId);
        if (msgIndex === -1 || msgIndex === 0) return;

        runEdit(
            true,
            () => {
                const remainingMessages = chunk.messages.splice(msgIndex);
                const newChunk: Chunk = {
                    chunkId: generateId(),
                    docId: doc.docId,
                    chunkName: `${chunk.chunkName} (拆分)`,
                    chunkIndex: chunk.chunkIndex + 1,
                    messages: remainingMessages,
                };
                doc.chunks.splice(chunk.chunkIndex + 1, 0, newChunk);
            },
            {
                normalize: () => logStore.normalizeDocument(doc),
            },
        );
    }

    function insertChunks(
        targetDocId: string,
        chunks: Chunk[],
        insertIndex: number,
    ) {
        const doc = logStore.findDocumentById(targetDocId);
        if (!doc || chunks.length === 0) return;

        runEdit(
            true,
            () => {
                const clampedIndex = Math.max(
                    0,
                    Math.min(insertIndex, doc.chunks.length),
                );
                doc.chunks.splice(clampedIndex, 0, ...chunks);
            },
            {
                normalize: () => logStore.normalizeDocument(doc),
            },
        );
    }

    return {
        addMessage,
        insertMessages,
        insertNewMessageAfter,
        deleteMessage,
        updateMessage,
        moveMessages,
        reorderMessageInChunk,
        batchDeleteMessages,
        batchUpdateMessages,
        mergeMessages,
        mergeWithNextMessage,
        toggleOoc,
        toggleCommand,

        updateChunk,
        renameDocument,
        deleteChunk,
        moveChunk,
        reorderChunk,
        mergeChunks,
        mergeWithNextChunk,
        splitChunk,
        insertChunks,
    };
});
