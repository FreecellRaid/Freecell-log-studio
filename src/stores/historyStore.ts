import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useLogStore } from './logStore';
import { useStyleStore } from './styleStore';
import type { LogDocument, MessageFilter } from '@/types/log';
import type { ColorRule } from '@/types/style';

interface HistorySnapshot {
    documents: LogDocument[];
    rules: ColorRule[];
}

export const useHistoryStore = defineStore('history', () => {
    const logStore = useLogStore();
    const styleStore = useStyleStore();

    const maxSteps = 5;
    const undoStack = ref<HistorySnapshot[]>([]);
    const redoStack = ref<HistorySnapshot[]>([]);
    const isRestoring = ref(false);
    const captureDisabledDepth = ref(0);

    const canUndo = computed(() => undoStack.value.length > 0);
    const canRedo = computed(() => redoStack.value.length > 0);

    function cloneMessageFilter(filter: MessageFilter): MessageFilter {
        const clonedFilter: MessageFilter = {};

        if (filter.messageId !== undefined)
            clonedFilter.messageId = cloneFilterValue(filter.messageId);
        if (filter.chunkId !== undefined)
            clonedFilter.chunkId = cloneFilterValue(filter.chunkId);
        if (filter.messageIndex !== undefined)
            clonedFilter.messageIndex = cloneFilterValue(filter.messageIndex);
        if (filter.playerName !== undefined)
            clonedFilter.playerName = cloneFilterValue(filter.playerName);
        if (filter.account !== undefined)
            clonedFilter.account = cloneFilterValue(filter.account);
        if (filter.time !== undefined)
            clonedFilter.time = new Date(filter.time.getTime());
        if (filter.content !== undefined)
            clonedFilter.content = cloneFilterValue(filter.content);
        if (filter.isOoc !== undefined) clonedFilter.isOoc = filter.isOoc;
        if (filter.isCommand !== undefined)
            clonedFilter.isCommand = filter.isCommand;
        if (filter.role !== undefined) clonedFilter.role = filter.role;
        if (filter.note !== undefined)
            clonedFilter.note = cloneFilterValue(filter.note);

        return clonedFilter;
    }

    function cloneFilterValue<T>(value: T): T {
        if (Array.isArray(value)) {
            return [...value] as T;
        }

        if (value instanceof RegExp) {
            return new RegExp(value.source, value.flags) as T;
        }

        return value;
    }

    function cloneDocuments(documents: LogDocument[]): LogDocument[] {
        return documents.map((doc) => ({
            docId: doc.docId,
            docName: doc.docName,
            docIndex: doc.docIndex,
            isExpanded: doc.isExpanded,
            chunks: doc.chunks.map((chunk) => ({
                chunkId: chunk.chunkId,
                docId: chunk.docId,
                chunkName: chunk.chunkName,
                chunkIndex: chunk.chunkIndex,
                messages: chunk.messages.map((message) => ({
                    messageId: message.messageId,
                    chunkId: message.chunkId,
                    messageIndex: message.messageIndex,
                    playerName: message.playerName,
                    account: message.account,
                    time: new Date(message.time.getTime()),
                    content: message.content,
                    isOoc: message.isOoc,
                    isCommand: message.isCommand,
                    role: message.role,
                    note: message.note,
                })),
            })),
        }));
    }

    function cloneRules(rules: ColorRule[]): ColorRule[] {
        return rules.map((rule) => ({
            ruleId: rule.ruleId,
            ruleName: rule.ruleName,
            filter: cloneMessageFilter(rule.filter),
            color: rule.color,
            colorArea: rule.colorArea,
            priority: rule.priority,
            isActive: rule.isActive,
        }));
    }

    function createSnapshot(): HistorySnapshot {
        return {
            documents: cloneDocuments(logStore.documents),
            rules: cloneRules(styleStore.rules),
        };
    }

    function pushSnapshot(stack: typeof undoStack, snapshot: HistorySnapshot) {
        stack.value.push(snapshot);
        if (stack.value.length > maxSteps) {
            stack.value.shift();
        }
    }

    function restoreSnapshot(snapshot: HistorySnapshot) {
        isRestoring.value = true;
        try {
            logStore.replaceDocuments(cloneDocuments(snapshot.documents));
            styleStore.replaceRules(cloneRules(snapshot.rules));
        } finally {
            isRestoring.value = false;
        }
    }

    function captureSnapshot() {
        if (isRestoring.value || captureDisabledDepth.value > 0) {
            return;
        }

        try {
            pushSnapshot(undoStack, createSnapshot());
            redoStack.value = [];
        } catch (error) {
            console.error('[history] captureSnapshot failed:', error);
        }
    }

    function undo() {
        const snapshot = undoStack.value.pop();
        if (!snapshot) {
            return;
        }

        pushSnapshot(redoStack, createSnapshot());
        restoreSnapshot(snapshot);
    }

    function redo() {
        const snapshot = redoStack.value.pop();
        if (!snapshot) {
            return;
        }

        pushSnapshot(undoStack, createSnapshot());
        restoreSnapshot(snapshot);
    }

    function clearHistory() {
        undoStack.value = [];
        redoStack.value = [];
    }

    function runWithoutCapture<T>(fn: () => T): T {
        captureDisabledDepth.value++;
        try {
            return fn();
        } finally {
            captureDisabledDepth.value--;
        }
    }

    return {
        undoStack,
        redoStack,
        isRestoring,
        canUndo,
        canRedo,
        captureSnapshot,
        undo,
        redo,
        clearHistory,
        runWithoutCapture,
    };
});
