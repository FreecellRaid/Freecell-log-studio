import { defineStore } from 'pinia';
import { useLogStore } from '@/stores/project/logStore';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { useStyleStore } from '@/stores/project/styleStore';
import { generateId } from '@/utils/id';
import type {
    Chunk,
    ChunkUpdates,
    Message,
    MessageUpdates,
    RoleType,
} from '@/types/log';
import type { ColorMode } from '@/types/style';
import { normalizeDocuments } from '@/editor/normalize';
import { deriveDefaultProjectName } from '@/io/storage/project';

function hasKeys<T extends object>(value: T) {
    return Object.keys(value).length > 0;
}

export const useLogCommands = defineStore('logCommands', () => {
    const logStore = useLogStore();
    const historyStore = useHistoryStore();
    const styleStore = useStyleStore();

    function executeEdit(
        hasChange: boolean | (() => boolean),
        mutate: () => void,
        options?: {
            syncProjectName?: boolean;
            syncSystemRules?: boolean;
            afterMutate?: () => void;
        },
    ): boolean {
        const shouldRun =
            typeof hasChange === 'function' ? hasChange() : hasChange;
        if (!shouldRun) {
            return false;
        }

        historyStore.captureSnapshot();
        mutate();
        normalizeDocuments(logStore.documents);
        options?.afterMutate?.();
        if (options?.syncProjectName) {
            if (!logStore.isProjectNameCustomized) {
                logStore.setProjectName(
                    deriveDefaultProjectName(logStore.documents),
                    false,
                );
            }
        }
        if (options?.syncSystemRules !== false) {
            styleStore.syncSystemRulesFromMessages(logStore.allMessages);
        }

        return true;
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
        return insertMessages(chunkId, [message], insertIndex);
    }

    function insertMessages(
        chunkId: string,
        messages: Message[],
        insertIndex: number,
    ) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk || messages.length === 0) return false;

        return executeEdit(true, () => {
            const clampedIndex = Math.max(
                0,
                Math.min(insertIndex, chunk.messages.length),
            );
            chunk.messages.splice(clampedIndex, 0, ...messages);
        });
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

        return insertMessages(chunkId, [newMessage], index + 1);
    }

    function deleteMessage(chunkId: string, messageId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return false;

        const index = chunk.messages.findIndex(
            (m) => m.messageId === messageId,
        );
        return executeEdit(index !== -1, () => {
            chunk.messages.splice(index, 1);
        });
    }

    function updateMessage(
        chunkId: string,
        messageId: string,
        updates: MessageUpdates,
    ) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return false;

        const message = chunk.messages.find((m) => m.messageId === messageId);
        if (!message) return false;

        return executeEdit(
            hasKeys(updates) && hasEntityUpdates(message, updates),
            () => {
                Object.assign(message, updates);
            },
        );
    }

    function moveMessages(
        messageIds: string[],
        sourceChunkId: string,
        targetChunkId: string,
        targetIndex: number,
    ) {
        if (messageIds.length === 0) return false;

        const sourceChunk = logStore.findChunkById(sourceChunkId);
        const targetChunk = logStore.findChunkById(targetChunkId);
        if (!sourceChunk || !targetChunk) return false;

        const idSet = new Set(messageIds);
        const movingMessages = sourceChunk.messages.filter((m) =>
            idSet.has(m.messageId),
        );
        if (movingMessages.length === 0) return false;

        const sourcePositions = sourceChunk.messages
            .map((message, index) =>
                idSet.has(message.messageId) ? index : -1,
            )
            .filter((index) => index !== -1);
        const currentStartIndex = sourcePositions[0] ?? -1;
        const currentEndIndex =
            sourcePositions[sourcePositions.length - 1] ?? -1;
        const normalizedTargetIndex = Math.max(
            0,
            Math.min(targetIndex, targetChunk.messages.length),
        );
        const isNoopMove =
            sourceChunkId === targetChunkId &&
            currentStartIndex !== -1 &&
            normalizedTargetIndex >= currentStartIndex &&
            normalizedTargetIndex <= currentEndIndex + 1;

        return executeEdit(!isNoopMove, () => {
            sourceChunk.messages = sourceChunk.messages.filter(
                (m) => !idSet.has(m.messageId),
            );
            const clampedIndex = Math.max(
                0,
                Math.min(targetIndex, targetChunk.messages.length),
            );
            targetChunk.messages.splice(clampedIndex, 0, ...movingMessages);
        });
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
            return false;
        }

        return executeEdit(true, () => {
            const [message] = chunk.messages.splice(oldIndex, 1);
            if (message) {
                chunk.messages.splice(newIndex, 0, message);
            }
        });
    }

    function batchDeleteMessages(targetIds: Set<string>) {
        if (targetIds.size === 0) return false;

        return executeEdit(
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
        );
    }

    function batchUpdateMessages(
        targetIds: Set<string>,
        updates: MessageUpdates,
    ) {
        if (targetIds.size === 0 || !hasKeys(updates)) return false;

        return executeEdit(
            () =>
                logStore.documents.some((doc) =>
                    doc.chunks.some((chunk) =>
                        chunk.messages.some(
                            (message) =>
                                targetIds.has(message.messageId) &&
                                hasEntityUpdates(message, updates),
                        ),
                    ),
                ),
            () => {
                logStore.documents.forEach((doc) => {
                    doc.chunks.forEach((chunk) => {
                        chunk.messages.forEach((message) => {
                            if (targetIds.has(message.messageId)) {
                                Object.assign(message, updates);
                            }
                        });
                    });
                });
            },
        );
    }

    function renameIdentity(
        mode: ColorMode,
        oldValue: string,
        newValue: string,
    ) {
        const normalizedValue = newValue.trim();
        if (!normalizedValue || normalizedValue === oldValue) return false;

        const sourceMessages = logStore.allMessages.filter(
            (message) => message[mode] === oldValue,
        );
        if (sourceMessages.length === 0) return false;

        const targetMessages = logStore.allMessages.filter(
            (message) => message[mode] === normalizedValue,
        );
        const mergedRole: RoleType =
            targetMessages[0]?.role ?? sourceMessages[0]?.role ?? 'unknown';

        return executeEdit(true, () => {
            sourceMessages.forEach((message) => {
                message[mode] = normalizedValue;
            });
            const didMergeRule = styleStore.updateSystemRuleTarget(
                mode,
                oldValue,
                normalizedValue,
            );
            if (didMergeRule) {
                [...sourceMessages, ...targetMessages].forEach((message) => {
                    message.role = mergedRole;
                });
            }
        });
    }

    function mergeMessages(
        chunkId: string,
        messageIds: string[],
        targetMessageId?: string,
    ) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk || messageIds.length < 2) return false;

        const toMerge = chunk.messages
            .filter((m) => messageIds.includes(m.messageId))
            .sort((a, b) => a.messageIndex - b.messageIndex);
        if (toMerge.length < 2) return false;

        const target =
            toMerge.find((m) => m.messageId === targetMessageId) || toMerge[0];
        const mergedContent = toMerge.map((m) => m.content).join('\n');
        const removeIds = new Set(
            toMerge
                .map((message) => message.messageId)
                .filter((id) => id !== target.messageId),
        );

        return executeEdit(
            target.content !== mergedContent || removeIds.size > 0,
            () => {
                target.content = mergedContent;
                chunk.messages = chunk.messages.filter(
                    (m) => !removeIds.has(m.messageId),
                );
            },
        );
    }

    function mergeWithNextMessage(chunkId: string, messageId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return false;

        const index = chunk.messages.findIndex(
            (m) => m.messageId === messageId,
        );
        if (index === -1 || index >= chunk.messages.length - 1) return false;

        const nextMessage = chunk.messages[index + 1];
        return mergeMessages(
            chunkId,
            [messageId, nextMessage.messageId],
            messageId,
        );
    }

    function toggleOoc(targetIds: Set<string>) {
        if (targetIds.size === 0) return false;

        return executeEdit(
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
            { syncSystemRules: false },
        );
    }

    function toggleCommand(targetIds: Set<string>) {
        if (targetIds.size === 0) return false;

        return executeEdit(
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
            { syncSystemRules: false },
        );
    }

    function updateChunk(chunkId: string, updates: ChunkUpdates) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return false;

        const doc = logStore.findDocumentById(chunk.docId);
        if (!doc) return false;

        return executeEdit(
            hasKeys(updates) && hasEntityUpdates(chunk, updates),
            () => {
                Object.assign(chunk, updates);
            },
            { syncSystemRules: false },
        );
    }

    function createDocument(docName = '未命名文档') {
        const docId = generateId();
        const chunkId = generateId();
        const document = {
            docId,
            docName: docName.trim() || '未命名文档',
            docIndex: logStore.documents.length,
            chunks: [
                {
                    chunkId,
                    docId,
                    chunkName: '未命名场景',
                    chunkIndex: 0,
                    messages: [],
                },
            ],
            isExpanded: true,
        };

        executeEdit(
            true,
            () => {
                logStore.documents.push(document);
            },
            { syncProjectName: true, syncSystemRules: false },
        );
        return docId;
    }

    function createChunk(
        docId: string,
        chunkName = '未命名场景',
        insertIndex?: number,
    ) {
        const doc = logStore.findDocumentById(docId);
        if (!doc) return null;

        const targetIndex =
            insertIndex === undefined
                ? doc.chunks.length
                : Math.max(0, Math.min(insertIndex, doc.chunks.length));
        const chunkId = generateId();
        const chunk: Chunk = {
            chunkId,
            docId,
            chunkName: chunkName.trim() || '未命名场景',
            chunkIndex: targetIndex,
            messages: [],
        };

        executeEdit(
            true,
            () => {
                doc.chunks.splice(targetIndex, 0, chunk);
                doc.isExpanded = true;
            },
            { syncSystemRules: false },
        );
        return chunkId;
    }

    function renameDocument(docId: string, docName: string) {
        const doc = logStore.findDocumentById(docId);
        if (!doc) return false;

        const normalizedName = docName.trim();
        return executeEdit(
            normalizedName.length > 0 && normalizedName !== doc.docName,
            () => {
                doc.docName = normalizedName;
            },
            { syncProjectName: true, syncSystemRules: false },
        );
    }

    function setDocumentExpanded(docId: string, isExpanded: boolean) {
        const doc = logStore.findDocumentById(docId);
        if (!doc || doc.isExpanded === isExpanded) return false;
        logStore.setDocumentExpanded(docId, isExpanded);
        return true;
    }

    function deleteDocument(docId: string) {
        const index = logStore.documents.findIndex(
            (doc) => doc.docId === docId,
        );
        if (index === -1) return false;

        return executeEdit(
            true,
            () => {
                logStore.documents.splice(index, 1);
            },
            { syncProjectName: true },
        );
    }

    function moveDocument(docId: string, targetIndex: number) {
        const sourceIndex = logStore.documents.findIndex(
            (doc) => doc.docId === docId,
        );
        if (sourceIndex === -1) return false;

        const normalizedTargetIndex = Math.max(
            0,
            Math.min(targetIndex, logStore.documents.length),
        );
        const isNoopMove =
            normalizedTargetIndex >= sourceIndex &&
            normalizedTargetIndex <= sourceIndex + 1;

        return executeEdit(
            !isNoopMove,
            () => {
                const [document] = logStore.documents.splice(sourceIndex, 1);
                const clampedIndex = Math.max(
                    0,
                    Math.min(targetIndex, logStore.documents.length),
                );
                logStore.documents.splice(clampedIndex, 0, document);
            },
            { syncProjectName: true, syncSystemRules: false },
        );
    }

    function deleteChunk(chunkId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return false;

        const doc = logStore.findDocumentById(chunk.docId);
        if (!doc) return false;

        return executeEdit(
            doc.chunks.some((c) => c.chunkId === chunkId),
            () => {
                doc.chunks = doc.chunks.filter((c) => c.chunkId !== chunkId);
            },
        );
    }

    function moveChunk(
        chunkId: string,
        targetDocId: string,
        targetIndex: number,
    ) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return false;

        const sourceDoc = logStore.findDocumentById(chunk.docId);
        const targetDoc = logStore.findDocumentById(targetDocId);
        if (!sourceDoc || !targetDoc) return false;

        const sourceIndex = sourceDoc.chunks.findIndex(
            (c) => c.chunkId === chunkId,
        );
        if (sourceIndex === -1) return false;

        const normalizedTargetIndex = Math.max(
            0,
            Math.min(targetIndex, targetDoc.chunks.length),
        );
        const isNoopMove =
            sourceDoc.docId === targetDoc.docId &&
            normalizedTargetIndex >= sourceIndex &&
            normalizedTargetIndex <= sourceIndex + 1;

        return executeEdit(!isNoopMove, () => {
            sourceDoc.chunks.splice(sourceIndex, 1);
            const clampedIndex = Math.max(
                0,
                Math.min(targetIndex, targetDoc.chunks.length),
            );
            targetDoc.chunks.splice(clampedIndex, 0, chunk);
        });
    }

    function reorderChunk(oldIndex: number, newIndex: number) {
        const chunks = logStore.allChunks;
        if (
            oldIndex < 0 ||
            oldIndex >= chunks.length ||
            newIndex < 0 ||
            newIndex >= chunks.length
        ) {
            return false;
        }

        const sourceChunk = chunks[oldIndex];
        const targetChunk = chunks[newIndex];
        if (!sourceChunk || !targetChunk) return false;

        return moveChunk(
            sourceChunk.chunkId,
            targetChunk.docId,
            targetChunk.chunkIndex,
        );
    }

    function mergeChunks(chunkIds: string[]) {
        if (chunkIds.length < 2) return false;

        const chunks = chunkIds
            .map((id) => logStore.findChunkById(id))
            .filter((chunk): chunk is Chunk => !!chunk)
            .sort((a, b) => a.chunkIndex - b.chunkIndex);
        if (chunks.length < 2) return false;
        if (chunks.some((chunk) => chunk.docId !== chunks[0].docId))
            return false;

        const targetChunk = chunks[0];
        const doc = logStore.findDocumentById(targetChunk.docId);
        if (!doc) return false;

        const otherIds = new Set(chunks.slice(1).map((chunk) => chunk.chunkId));
        return executeEdit(otherIds.size > 0, () => {
            targetChunk.messages = chunks.flatMap((chunk) => chunk.messages);
            targetChunk.chunkName = targetChunk.chunkName || '合并后的分块';
            doc.chunks = doc.chunks.filter(
                (chunk) => !otherIds.has(chunk.chunkId),
            );
        });
    }

    function mergeWithNextChunk(chunkId: string) {
        const currentChunk = logStore.findChunkById(chunkId);
        if (!currentChunk) return false;

        const doc = logStore.findDocumentById(currentChunk.docId);
        if (!doc) return false;

        const chunkIndex = doc.chunks.findIndex(
            (chunk) => chunk.chunkId === chunkId,
        );
        if (chunkIndex === -1 || chunkIndex >= doc.chunks.length - 1)
            return false;

        const nextChunk = doc.chunks[chunkIndex + 1];
        return executeEdit(true, () => {
            currentChunk.messages.push(...nextChunk.messages);
            doc.chunks.splice(chunkIndex + 1, 1);
        });
    }

    function splitChunk(chunkId: string, messageId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return false;

        const doc = logStore.findDocumentById(chunk.docId);
        if (!doc) return false;

        const msgIndex = chunk.messages.findIndex(
            (m) => m.messageId === messageId,
        );
        if (msgIndex === -1 || msgIndex === 0) return false;

        return executeEdit(true, () => {
            const remainingMessages = chunk.messages.splice(msgIndex);
            const newChunk: Chunk = {
                chunkId: generateId(),
                docId: doc.docId,
                chunkName: `${chunk.chunkName} (拆分)`,
                chunkIndex: chunk.chunkIndex + 1,
                messages: remainingMessages,
            };
            doc.chunks.splice(chunk.chunkIndex + 1, 0, newChunk);
        });
    }

    function insertChunks(
        targetDocId: string,
        chunks: Chunk[],
        insertIndex: number,
    ) {
        const doc = logStore.findDocumentById(targetDocId);
        if (!doc || chunks.length === 0) return false;

        return executeEdit(true, () => {
            const clampedIndex = Math.max(
                0,
                Math.min(insertIndex, doc.chunks.length),
            );
            doc.chunks.splice(clampedIndex, 0, ...chunks);
        });
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
        renameIdentity,
        mergeMessages,
        mergeWithNextMessage,
        toggleOoc,
        toggleCommand,

        createDocument,
        createChunk,
        updateChunk,
        renameDocument,
        setDocumentExpanded,
        deleteDocument,
        moveDocument,
        deleteChunk,
        moveChunk,
        reorderChunk,
        mergeChunks,
        mergeWithNextChunk,
        splitChunk,
        insertChunks,
    };
});
