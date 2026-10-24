import { watch } from 'vue';
import { useWorkspaceStore } from '@/stores/ui/workspaceStore';
import { useLayoutStore } from '@/stores/ui/layoutStore';
import { useDialogStore } from '@/stores/ui/dialogStore';
import { useCommandContextStore } from '@/stores/ui/commandContextStore';
import { useLogStore } from '@/stores/project/logStore';
import { useEditorSessionStore } from '@/stores/editor/editorSessionStore';
import { useEditorNavigation } from './useEditorNavigation';

// 仅在应用根部安装一次；业务删除、撤销及弹窗关闭都可触发状态协调。
export function useEditorRuntime() {
    const workspace = useWorkspaceStore();
    const layout = useLayoutStore();
    const dialogs = useDialogStore();
    const commands = useCommandContextStore();
    const log = useLogStore();
    const navigation = useEditorNavigation();
    const session = useEditorSessionStore();
    watch(
        () => log.allChunks.map((chunk) => chunk.chunkId),
        (ids) => {
            const available = new Set(ids);
            navigation.pruneScenes((id) => available.has(id));
        },
        // 移动场景会先移出再插入；等待本轮业务操作完成，避免误关仍存在的场景。
        { immediate: true, flush: 'pre' },
    );
    watch(
        () => [
            workspace.panes,
            workspace.activePaneId,
            layout.sidebarOpen,
            layout.activePanel,
            layout.inspectorOpen,
            dialogs.isBlocking,
            commands.current,
        ],
        () => {
            navigation.reconcileContext();
            if (!session.editingPaneId) return;
            const pane = workspace.panes.find(
                (item) => item.paneId === session.editingPaneId,
            );
            const target = session.activeTarget;
            if (
                !pane ||
                (target &&
                    target.kind !== 'projectName' &&
                    (pane.view.kind !== 'scene' ||
                        pane.view.chunkId !== target.chunkId))
            )
                session.stopEditing();
        },
        { deep: true, immediate: true, flush: 'sync' },
    );
}
