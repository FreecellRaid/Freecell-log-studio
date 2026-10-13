import { cloneDocuments, cloneRules } from '@/io/storage/project';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useLogStore } from '@/stores/project/logStore';
import { useStyleStore } from '../project/styleStore';
import type { LogDocument } from '@/types/log';
import type { StyleRule } from '@/types/style';

interface HistorySnapshot {
    documents: LogDocument[];
    rules: StyleRule[];
}

export const useHistoryStore = defineStore('history', () => {
    const logStore = useLogStore();
    const styleStore = useStyleStore();

    const maxSteps = 20;
    const undoStack = ref<HistorySnapshot[]>([]);
    const redoStack = ref<HistorySnapshot[]>([]);
    const isRestoring = ref(false);
    const captureDisabledDepth = ref(0);

    const canUndo = computed(() => undoStack.value.length > 0);
    const canRedo = computed(() => redoStack.value.length > 0);

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
    };
});
