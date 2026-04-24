import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Chunk, LogDocument } from '@/types/log';
import { useHistoryStore } from './historyStore';
import { generateId } from '@/utils/id';
import { deriveDefaultProjectName } from '@/io/localStorage/project';

export function newlogStore() {
    const documents = ref<LogDocument[]>([]);
    const isImported = ref<boolean>(false);
    const projectId = ref<string>(generateId());
    const projectName = ref<string>('');
    const projectTime = ref<string>('');
    const isProjectNameCustomized = ref<boolean>(false);

    function normalizeMessages(chunk: Chunk) {
        chunk.messages.forEach((message, messageIndex) => {
            message.chunkId = chunk.chunkId;
            message.messageIndex = messageIndex;
        });
    }

    function normalizeChunk(chunk: Chunk, docId: string, chunkIndex: number) {
        chunk.docId = docId;
        chunk.chunkIndex = chunkIndex;
        normalizeMessages(chunk);
    }

    function normalizeDocument(doc: LogDocument, docIndex: number = doc.docIndex) {
        doc.docIndex = docIndex;
        doc.chunks.forEach((chunk, chunkIndex) => {
            normalizeChunk(chunk, doc.docId, chunkIndex);
        });
    }

    function normalizeDocuments(targetDocs: LogDocument[]) {
        targetDocs.forEach((doc, docIndex) => {
            normalizeDocument(doc, docIndex);
        });
    }

    const totalMessages = computed(() => {
        return documents.value.reduce((total, doc) => {
            return (
                total +
                doc.chunks.reduce((chunkTotal, chunk) => {
                    return chunkTotal + chunk.messages.length;
                }, 0)
            );
        }, 0);
    });

    const allMessages = computed(() => {
        return documents.value.flatMap((doc) =>
            doc.chunks.flatMap((chunk) => chunk.messages),
        );
    });

    const allChunks = computed(() => {
        return documents.value.flatMap((doc) => doc.chunks);
    });

    function appendDocuments(newDocs: LogDocument[]) {
        documents.value.push(...newDocs);
        normalizeDocuments(documents.value);
        isImported.value = documents.value.length > 0;
        syncProjectNameFromDocuments();
        useHistoryStore().clearHistory();
    }

    function removeDocument(docId: string) {
        const index = documents.value.findIndex((d) => d.docId === docId);
        if (index === -1) {
            return;
        }

        useHistoryStore().captureSnapshot();
        documents.value.splice(index, 1);
        normalizeDocuments(documents.value);
        isImported.value = documents.value.length > 0;
        syncProjectNameFromDocuments();
    }

    function updateDocument(docId: string, updates: Partial<LogDocument>) {
        const doc = documents.value.find((d) => d.docId === docId);
        if (doc) {
            Object.assign(doc, updates);
            syncProjectNameFromDocuments();
        }
    }

    function clearData() {
        documents.value = [];
        isImported.value = false;
        projectId.value = generateId();
        projectName.value = '';
        projectTime.value = '';
        isProjectNameCustomized.value = false;
        useHistoryStore().clearHistory();
    }

    function replaceDocuments(newDocuments: LogDocument[]) {
        normalizeDocuments(newDocuments);
        documents.value = newDocuments;
        isImported.value = documents.value.length > 0;
        syncProjectNameFromDocuments();
    }

    function syncProjectNameFromDocuments() {
        if (isProjectNameCustomized.value) {
            return;
        }

        projectName.value = deriveDefaultProjectName(documents.value);
    }

    function setProjectName(
        nextProjectName: string,
        customized: boolean = true,
    ) {
        const normalizedName = nextProjectName.trim();

        if (normalizedName) {
            projectName.value = normalizedName;
            isProjectNameCustomized.value = customized;
            return;
        }

        isProjectNameCustomized.value = false;
        projectName.value = deriveDefaultProjectName(documents.value);
    }

    function setProjectTime(nextProjectTime: string) {
        projectTime.value = nextProjectTime;
    }

    function setProjectMeta(params: {
        projectId?: string;
        projectName?: string;
        projectTime?: string;
        isProjectNameCustomized?: boolean;
    }) {
        if (params.projectId !== undefined) {
            projectId.value = params.projectId;
        }

        if (params.projectTime !== undefined) {
            projectTime.value = params.projectTime;
        }

        if (params.isProjectNameCustomized !== undefined) {
            isProjectNameCustomized.value = params.isProjectNameCustomized;
        }

        if (params.projectName !== undefined) {
            projectName.value = params.projectName.trim();
            if (!projectName.value && !isProjectNameCustomized.value) {
                projectName.value = deriveDefaultProjectName(documents.value);
            }
        }
    }

    function findDocumentById(docId: string) {
        return documents.value.find((d) => d.docId === docId);
    }

    function findChunkById(chunkId: string) {
        for (const doc of documents.value) {
            const chunk = doc.chunks.find((c) => c.chunkId === chunkId);
            if (chunk) return chunk;
        }
        return null;
    }

    return {
        documents,
        isImported,
        projectId,
        projectName,
        projectTime,
        isProjectNameCustomized,

        totalMessages,
        allMessages,
        allChunks,

        appendDocuments,
        removeDocument,
        updateDocument,
        clearData,
        replaceDocuments,

        syncProjectNameFromDocuments,
        setProjectName,
        setProjectTime,
        setProjectMeta,

        findDocumentById,
        findChunkById,

        normalizeDocuments,
        normalizeDocument,
        normalizeChunk,
        normalizeMessages,
    };
}

export const useLogStore = defineStore('log', newlogStore);
