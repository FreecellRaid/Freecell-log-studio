import { watch } from 'vue';
import { useWorkspaceStore } from '@/stores/ui/workspaceStore';
import { useLayoutStore } from '@/stores/ui/layoutStore';
import { useDialogStore } from '@/stores/ui/dialogStore';
import { useCommandContextStore } from '@/stores/ui/commandContextStore';
import { useLogStore } from '@/stores/project/logStore';
import { useEditorNavigation } from './useEditorNavigation';

// 仅在应用根部安装一次；业务删除、撤销及弹窗关闭都可触发状态协调。
export function useEditorRuntime() {
    const workspace = useWorkspaceStore();
    const layout = useLayoutStore();
    const dialogs = useDialogStore();
    const commands = useCommandContextStore();
    const log = useLogStore();
    const navigation = useEditorNavigation();
    watch(
        () => log.allChunks.map((chunk) => chunk.chunkId),
        (ids) => {
            const available = new Set(ids);
            navigation.pruneScenes((id) => available.has(id));
        },
        { immediate: true, flush: 'sync' },
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
        navigation.reconcileContext,
        { deep: true, immediate: true, flush: 'sync' },
    );
}
