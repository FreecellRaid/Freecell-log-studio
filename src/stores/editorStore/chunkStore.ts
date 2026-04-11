import { defineStore } from 'pinia';
import { useLogStore } from '@/stores/logStore';
import { useHistoryStore } from '@/stores/historyStore';
import { generateId } from '@/utils/id';
import type { Chunk, LogDocument } from '@/types/log';

export const useChunkEditorStore = defineStore('chunkEditor', () => {
    const logStore = useLogStore();
    const historyStore = useHistoryStore();

    // 刷新文档内所有块的局部索引并同步 docId
    function refreshChunkMetadata(doc: LogDocument) {
        doc.chunks.forEach((chunk, index) => {
            chunk.chunkIndex = index;
            chunk.docId = doc.docId; // 确保块始终指向当前所属文档

            // 同时确保块内消息的 chunkId 也是正确的
            chunk.messages.forEach((m, messageIndex) => {
                m.chunkId = chunk.chunkId;
                m.messageIndex = messageIndex;
            });
        });
    }

    //基础CRUD
    function updateChunk(chunkId: string, updates: Partial<Chunk>) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const keys = Object.keys(updates) as Array<keyof Chunk>;
        const hasChange = keys.some(
            (key) => !Object.is(chunk[key], updates[key]),
        );
        if (!hasChange) return;

        historyStore.captureSnapshot();
        Object.assign(chunk, updates);
    }

    function renameDocument(docId: string, docName: string) {
        const doc = logStore.findDocumentById(docId);
        if (!doc) return;

        const normalizedName = docName.trim();
        if (normalizedName === doc.docName) return;

        historyStore.captureSnapshot();
        doc.docName = normalizedName;
        logStore.syncProjectNameFromDocuments();
    }

    function deleteChunk(chunkId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const doc = logStore.findDocumentById(chunk.docId);
        if (!doc) return;

        historyStore.captureSnapshot();
        doc.chunks = doc.chunks.filter((c) => c.chunkId !== chunkId);
        refreshChunkMetadata(doc);
    }

    // 移动块：支持同文档重排和跨文档转移
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

        const sourceIndex = sourceDoc.chunks.findIndex(
            (c) => c.chunkId === chunkId,
        );
        if (sourceIndex === -1) return;

        historyStore.captureSnapshot();
        sourceDoc.chunks.splice(sourceIndex, 1);
        const clampedIndex = Math.max(
            0,
            Math.min(targetIndex, targetDoc.chunks.length),
        );
        targetDoc.chunks.splice(clampedIndex, 0, chunk);

        refreshChunkMetadata(sourceDoc);
        if (sourceDoc.docId !== targetDoc.docId) {
            refreshChunkMetadata(targetDoc);
        }
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

        moveChunk(
            sourceChunk.chunkId,
            targetChunk.docId,
            targetChunk.chunkIndex,
        );
    }

    // 合并多个块为一个块
    function mergeChunks(chunkIds: string[]) {
        if (chunkIds.length < 2) return;

        const chunks = chunkIds
            .map((id) => logStore.findChunkById(id))
            .filter((c): c is Chunk => !!c)
            // 按文档和索引排序，确保合并顺序符合直觉
            .sort((a, b) => a.chunkIndex - b.chunkIndex);
        if (chunks.length < 2) return;
        if (chunks.some((chunk) => chunk.docId !== chunks[0].docId)) return;

        const targetChunk = chunks[0];
        const doc = logStore.findDocumentById(targetChunk.docId);
        if (!doc) return;

        const allMessages = chunks.flatMap((c) => c.messages);
        const otherIds = new Set(chunks.slice(1).map((chunk) => chunk.chunkId));
        historyStore.captureSnapshot();

        targetChunk.messages = allMessages;
        targetChunk.chunkName = targetChunk.chunkName || '合并后的分块';

        doc.chunks = doc.chunks.filter((c) => !otherIds.has(c.chunkId));

        refreshChunkMetadata(doc);
    }

    function mergeWithNextChunk(chunkId: string) {
        const currentChunk = logStore.findChunkById(chunkId);
        if (!currentChunk) return;

        const doc = logStore.findDocumentById(currentChunk.docId);
        if (!doc) return;

        const chunkIndex = doc.chunks.findIndex((c) => c.chunkId === chunkId);
        if (chunkIndex === -1 || chunkIndex >= doc.chunks.length - 1) return;

        const nextChunk = doc.chunks[chunkIndex + 1];
        historyStore.captureSnapshot();
        currentChunk.messages.push(...nextChunk.messages);
        doc.chunks.splice(chunkIndex + 1, 1);

        refreshChunkMetadata(doc);
    }

    // 在指定消息处拆分块
    function splitChunk(chunkId: string, messageId: string) {
        const chunk = logStore.findChunkById(chunkId);
        if (!chunk) return;

        const doc = logStore.findDocumentById(chunk.docId);
        if (!doc) return;

        const msgIndex = chunk.messages.findIndex(
            (m) => m.messageId === messageId,
        );
        if (msgIndex === -1 || msgIndex === 0) return;

        historyStore.captureSnapshot();

        const remainingMessages = chunk.messages.splice(msgIndex);
        const newChunk: Chunk = {
            chunkId: generateId(),
            docId: doc.docId,
            chunkName: `${chunk.chunkName} (拆分)`,
            chunkIndex: chunk.chunkIndex + 1,
            messages: remainingMessages,
        };
        doc.chunks.splice(chunk.chunkIndex + 1, 0, newChunk);

        refreshChunkMetadata(doc);
    }

    // 插入新块
    function insertChunks(
        targetDocId: string,
        chunks: Chunk[],
        insertIndex: number,
    ) {
        const doc = logStore.findDocumentById(targetDocId);
        if (!doc) return;

        historyStore.captureSnapshot();

        // 限制边界，防止溢出
        const clampedIndex = Math.max(
            0,
            Math.min(insertIndex, doc.chunks.length),
        );
        doc.chunks.splice(clampedIndex, 0, ...chunks);

        refreshChunkMetadata(doc);
    }

    return {
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
