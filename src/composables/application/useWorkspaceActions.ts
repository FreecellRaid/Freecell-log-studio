import { useProjectManager } from '@/composables/application/useProjectManager';
import { useClipboardStore } from '@/stores/editor/clipboardStore';
import { useHistoryStore } from '@/stores/editor/historyStore';
import { useLogStore } from '@/stores/project/logStore';
import { useStyleStore } from '@/stores/project/styleStore';
import { useWindowStore } from '@/stores/ui/windowStore';
import { useSelectionStore } from '@/stores/editor/selectionStore';
import { useEditorSessionStore } from '@/stores/editor/editorSessionStore';

export function useWorkspaceActions() {
    const logStore = useLogStore();
    const styleStore = useStyleStore();
    const clipboardStore = useClipboardStore();
    const historyStore = useHistoryStore();
    const windowStore = useWindowStore();
    const selectionStore = useSelectionStore();
    const editorSessionStore = useEditorSessionStore();
    const projectManager = useProjectManager();

    async function saveCurrentProjectWithFeedback(options?: {
        afterSave?: () => void | Promise<void>;
    }) {
        try {
            await projectManager.saveCurrentProjectToLocal();
        } catch (error) {
            console.error(error);
            alert(
                error instanceof Error
                    ? error.message
                    : '工程保存失败，请重试。',
            );
            return false;
        }
        try {
            await options?.afterSave?.();
        } catch (error) {
            console.error('工程已保存，但列表刷新失败', error);
        }
        alert('工程已成功保存到本地。');
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
        // 数据已清空，工作区里指向旧分块的视图一并移除，避免残留"未知场景"
        windowStore.pruneOrphanChunkViews(() => false);
        windowStore.setFocus(options?.focusTarget ?? 'defaultView');
        options?.afterClear?.();
        return true;
    }

    return {
        hasWorkspaceState: projectManager.hasWorkspaceState,
        storageState: projectManager.storageState,
        getStoredProjects: projectManager.getStoredProjects,
        openStoredProject: projectManager.openStoredProject,
        saveCurrentProjectWithFeedback,
        clearWorkspaceWithConfirmation,
    };
}
