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

    // 修改代数：每次真实修改 +1（单调递增，不受撤销栈容量淘汰影响）
    const editGeneration = ref(0);
    const savedGeneration = ref(0);
    // 已保存基线的工作区指纹，用于"改回去"场景的内容级判定
    const savedWorkspaceJson = ref<string | null>(null);

    const canUndo = computed(() => undoStack.value.length > 0);
    const canRedo = computed(() => redoStack.value.length > 0);

    function serializeWorkspace() {
        return JSON.stringify({
            documents: logStore.documents,
            rules: styleStore.rules,
        });
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
            editGeneration.value += 1;
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
        // 导入/清空/打开工程后以当前状态为基线，刷新不弹确认
        markSaved();
    }

    // 保存成功后调用：当前状态视为已保存基线
    function markSaved() {
        savedGeneration.value = editGeneration.value;
        savedWorkspaceJson.value = serializeWorkspace();
    }

    // 刷新确认用：修改过且当前内容与已保存基线不一致。
    // 先用修改代数短路（没改过不序列化），有修改时再做内容比对，
    // 这样 a→b→a 的净零变化不会触发刷新确认。
    function hasUnsavedChanges() {
        if (editGeneration.value <= savedGeneration.value) return false;
        if (savedWorkspaceJson.value === null) return true;
        return serializeWorkspace() !== savedWorkspaceJson.value;
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
        markSaved,
        hasUnsavedChanges,
    };
});
