import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { LogDocument, Message } from '@/types/log';
import { generateId } from '@/utils/id';
import { deriveDefaultProjectName } from '@/io/storage/project';
import { normalizeDocuments } from '@/editor/normalize';

export function newlogStore() {
    const documents = ref<LogDocument[]>([]);
    const isImported = computed(() => documents.value.length > 0);
    const projectId = ref<string>(generateId());
    const projectName = ref<string>('');
    const projectTime = ref<string>('');
    const isProjectNameCustomized = ref<boolean>(false);

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

    const messagesById = computed(() => {
        const index = new Map<string, Message>();
        allMessages.value.forEach((message) => {
            index.set(message.messageId, message);
        });
        return index;
    });

    const messageOrderById = computed(() => {
        const order = new Map<string, number>();
        allMessages.value.forEach((message, index) => {
            order.set(message.messageId, index);
        });
        return order;
    });

    const allChunks = computed(() => {
        return documents.value.flatMap((doc) => doc.chunks);
    });

    function appendDocuments(newDocs: LogDocument[]) {
        documents.value.push(...newDocs);
        normalizeDocuments(documents.value);
        syncProjectNameFromDocuments();
    }

    function setDocumentExpanded(docId: string, isExpanded: boolean) {
        const doc = documents.value.find((d) => d.docId === docId);
        if (doc) {
            doc.isExpanded = isExpanded;
        }
    }

    function clearData() {
        documents.value = [];
        projectId.value = generateId();
        projectName.value = '';
        projectTime.value = '';
        isProjectNameCustomized.value = false;
    }

    function replaceDocuments(newDocuments: LogDocument[]) {
        normalizeDocuments(newDocuments);
        documents.value = newDocuments;
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
        messagesById,
        messageOrderById,
        allChunks,

        appendDocuments,
        setDocumentExpanded,
        clearData,
        replaceDocuments,

        setProjectName,
        setProjectTime,
        setProjectMeta,

        findDocumentById,
        findChunkById,
    };
}

export const useLogStore = defineStore('log', newlogStore);
