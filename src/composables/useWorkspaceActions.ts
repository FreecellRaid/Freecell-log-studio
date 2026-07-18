import { useProjectManager } from '@/composables/useProjectManager';
import { useClipboardStore } from '@/stores/clipboardStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useLogStore } from '@/stores/logStore';
import { useStyleStore } from '@/stores/styleStore';
import { useWindowStore } from '@/stores/windowStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useEditorSessionStore } from '@/stores/editorSessionStore';

export function useWorkspaceActions() {
    const logStore = useLogStore();
    const styleStore = useStyleStore();
    const clipboardStore = useClipboardStore();
    const historyStore = useHistoryStore();
    const windowStore = useWindowStore();
    const selectionStore = useSelectionStore();
    const editorSessionStore = useEditorSessionStore();
    const projectManager = useProjectManager();

    function saveCurrentProjectWithFeedback(options?: {
        afterSave?: () => void;
    }) {
        const result = projectManager.saveCurrentProjectToLocal();
        if (!result.success) {
            alert('本地存储空间不足，保存失败。');
            return false;
        }

        options?.afterSave?.();
        alert(
            result.removedCount > 0
                ? `工程已保存，并自动清理了 ${result.removedCount} 个旧版本。`
                : '工程已成功保存到本地。',
        );
        return true;
    }

    function clearWorkspaceWithConfirmation(options?: {
        afterClear?: () => void;
        focusTarget?: string;
    }) {
        if (!projectManager.hasWorkspaceState.value) return false;
        if (!window.confirm('确定要清空所有数据吗？本操作不可撤销。')) {
            return false;
        }

        logStore.clearData();
        styleStore.clearRules();
        clipboardStore.clearClipboard();
        selectionStore.clearAllSelections();
        editorSessionStore.stopEditing();
        historyStore.clearHistory();
        windowStore.setFocus(options?.focusTarget ?? 'default');
        options?.afterClear?.();
        return true;
    }

    return {
        hasWorkspaceState: projectManager.hasWorkspaceState,
        getStoredProjects: projectManager.getStoredProjects,
        openStoredProject: projectManager.openStoredProject,
        saveCurrentProjectWithFeedback,
        clearWorkspaceWithConfirmation,
    };
}
